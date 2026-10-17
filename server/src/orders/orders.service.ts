import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import type { CartChange, Order, OrderLine, OrderStatus, PlaceOrderRequest } from '@pecan/shared';
import { ApiException } from '../common/api-exception.js';
import { MenuService } from '../menu/menu.service.js';
import { RealtimeEvents } from '../realtime/realtime-events.js';

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  received: 'preparing',
  preparing: 'ready',
  ready: 'completed',
  completed: null,
  cancelled: null,
};

/** How long an order stays in a status before the kitchen "moves" it automatically. */
export const AUTO_ADVANCE_MS: Partial<Record<OrderStatus, number>> = {
  received: 10_000,
  preparing: 15_000,
  ready: 10_000,
};

export interface PlaceOrderResult {
  order: Order;
  replayed: boolean;
}

interface IdempotencyRecord {
  fingerprint: string;
  orderId: string;
}

@Injectable()
export class OrdersService implements OnModuleDestroy {
  private readonly orders = new Map<string, Order>();
  private readonly idempotency = new Map<string, IdempotencyRecord>();
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private lastNumber = 0;

  constructor(
    private readonly menu: MenuService,
    private readonly events: RealtimeEvents,
  ) {}

  onModuleDestroy(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
  }

  list(): Order[] {
    return [...this.orders.values()].reverse();
  }

  /**
   * Synchronous on purpose: Node runs it start to finish, so two requests with the same key can't
   * interleave between the lookup and the save. An async store would need an atomic reservation.
   */
  place(idempotencyKey: string, request: PlaceOrderRequest): PlaceOrderResult {
    const fingerprint = fingerprintOf(request);
    const previous = this.idempotency.get(idempotencyKey);
    if (previous) {
      if (previous.fingerprint !== fingerprint) {
        throw new ApiException(
          'IDEMPOTENCY_CONFLICT',
          'This idempotency key was already used for a different order',
        );
      }
      return { order: this.requireOrder(previous.orderId), replayed: true };
    }

    const lines = this.priceLines(request);
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    if (request.discount > subtotal) {
      throw new ApiException('VALIDATION', 'The discount cannot exceed the order subtotal');
    }

    const order: Order = {
      id: randomUUID(),
      number: ++this.lastNumber,
      lines,
      subtotal,
      discount: request.discount,
      total: subtotal - request.discount,
      status: 'received',
      createdAt: new Date().toISOString(),
    };
    this.orders.set(order.id, order);
    this.idempotency.set(idempotencyKey, { fingerprint, orderId: order.id });
    this.publish(order);
    return { order, replayed: false };
  }

  updateStatus(id: string, status: OrderStatus): Order {
    const order = this.requireOrder(id);
    const next = NEXT_STATUS[order.status];
    const allowed = next !== null && (status === next || status === 'cancelled');
    if (!allowed) {
      throw new ApiException(
        'VALIDATION',
        `An order cannot go from "${order.status}" to "${status}"`,
      );
    }
    const updated: Order = { ...order, status };
    this.orders.set(id, updated);
    this.publish(updated);
    return updated;
  }

  /** Checks every line against the live menu; any difference rejects the whole order. */
  private priceLines(request: PlaceOrderRequest): OrderLine[] {
    const changes: CartChange[] = [];
    const lines: OrderLine[] = [];

    for (const { itemId, quantity, unitPrice } of request.lines) {
      const item = this.menu.findItem(itemId);
      if (!item) {
        changes.push({ kind: 'removed', itemId });
      } else if (!item.available) {
        changes.push({ kind: 'unavailable', itemId, name: item.name });
      } else if (item.price === null && unitPrice < 1) {
        throw new ApiException('VALIDATION', `Enter a price for "${item.name}"`);
      } else if (item.price !== null && item.price !== unitPrice) {
        changes.push({
          kind: 'priceChanged',
          itemId,
          name: item.name,
          expected: unitPrice,
          actual: item.price,
        });
      } else {
        lines.push({
          itemId,
          name: item.name,
          quantity,
          unitPrice,
          lineTotal: unitPrice * quantity,
        });
      }
    }

    if (changes.length > 0) {
      throw new ApiException('STALE_CART', 'Some items changed since they were added to the cart', {
        changes,
      });
    }
    return lines;
  }

  private publish(order: Order): void {
    this.events.publish({ type: 'order.upserted', order });
    this.scheduleAutoAdvance(order);
  }

  private scheduleAutoAdvance(order: Order): void {
    clearTimeout(this.timers.get(order.id));
    this.timers.delete(order.id);

    const next = NEXT_STATUS[order.status];
    const delay = AUTO_ADVANCE_MS[order.status];
    if (next === null || delay === undefined) return;

    this.timers.set(
      order.id,
      setTimeout(() => this.updateStatus(order.id, next), delay),
    );
  }

  private requireOrder(id: string): Order {
    const order = this.orders.get(id);
    if (!order) throw ApiException.notFound('Order', id);
    return order;
  }
}

/** Same cart contents → same fingerprint, so a retry matches and a different cart doesn't. */
function fingerprintOf(request: PlaceOrderRequest): string {
  const canonical = JSON.stringify({
    lines: request.lines.map(({ itemId, quantity, unitPrice }) => [itemId, quantity, unitPrice]),
    discount: request.discount,
  });
  return createHash('sha256').update(canonical).digest('hex');
}
