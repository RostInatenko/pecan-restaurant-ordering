import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import type { Order, OrderStatus } from '@pecan/shared';
import { Store } from '@ngrx/store';
import { OrdersApi } from '../../core/api/orders-api.service';
import type { AppError } from '../../core/http/app-error';
import { Notifier } from '../../core/notifier';
import { NEXT_ORDER_STATUS, ORDER_STATUS_LABELS } from '../../shared/order-status';
import { ordersFeature } from '../../state/orders/orders.feature';

/** Orders also advance on their own (server timer); this lets staff move them faster or cancel. */
@Component({
  selector: 'app-kitchen-tab',
  imports: [DatePipe, MatButton],
  template: `
    @if (orders().length === 0) {
      <p class="empty">No active orders. New orders show up here as soon as they're placed.</p>
    }
    <ul class="list">
      @for (order of orders(); track order.id) {
        <li class="row">
          <div class="text">
            <strong>#{{ order.number }}</strong>
            <span class="meta">
              {{ order.createdAt | date: 'shortTime' }} · {{ labels[order.status] }} ·
              {{ summary(order) }}
            </span>
          </div>
          @if (next[order.status]; as nextStatus) {
            <button
              mat-flat-button
              type="button"
              [disabled]="pending().has(order.id)"
              (click)="setStatus(order, nextStatus)"
            >
              Mark {{ labels[nextStatus].toLowerCase() }}
            </button>
          }
          <button
            mat-button
            type="button"
            [disabled]="pending().has(order.id)"
            (click)="setStatus(order, 'cancelled')"
          >
            Cancel
          </button>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
      padding: 16px 0;
    }
    .list {
      list-style: none;
      padding: 0;
    }
    .row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      align-items: center;
      gap: 8px;
      min-height: 64px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .meta,
    .empty {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitchenTab {
  private readonly store = inject(Store);
  private readonly api = inject(OrdersApi);
  private readonly notifier = inject(Notifier);

  protected readonly orders = this.store.selectSignal(ordersFeature.selectActiveOrders);
  protected readonly pending = signal<ReadonlySet<string>>(new Set());
  protected readonly labels = ORDER_STATUS_LABELS;
  protected readonly next = NEXT_ORDER_STATUS;

  protected summary(order: Order): string {
    return order.lines.map((line) => `${line.quantity}× ${line.name}`).join(', ');
  }

  protected setStatus(order: Order, status: OrderStatus): void {
    this.setPending(order.id, true);
    this.api.updateStatus(order.id, status).subscribe({
      next: () => this.setPending(order.id, false),
      error: (error: AppError) => {
        this.setPending(order.id, false);
        this.notifier.error(error.message);
      },
    });
  }

  private setPending(id: string, pending: boolean): void {
    this.pending.update((current) => {
      const next = new Set(current);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }
}
