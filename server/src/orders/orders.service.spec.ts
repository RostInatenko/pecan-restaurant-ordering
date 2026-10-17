import type { MenuItem, PlaceOrderRequest } from '@pecan/shared';
import { MenuService } from '../menu/menu.service.js';
import type { RealtimeEvents } from '../realtime/realtime-events.js';
import { AUTO_ADVANCE_MS, OrdersService } from './orders.service.js';

describe('OrdersService', () => {
  let publish: ReturnType<typeof vi.fn>;
  let menu: MenuService;
  let orders: OrdersService;
  let fixed: MenuItem;
  let open: MenuItem;

  const orderOf = (overrides: Partial<PlaceOrderRequest> = {}): PlaceOrderRequest => ({
    lines: [{ itemId: fixed.id, quantity: 2, unitPrice: fixed.price ?? 0 }],
    discount: 0,
    ...overrides,
  });

  beforeEach(() => {
    vi.useFakeTimers();
    publish = vi.fn();
    const events = { publish } as unknown as RealtimeEvents;
    menu = new MenuService(events);
    orders = new OrdersService(menu, events);
    const items = menu.snapshot().items.filter((item) => item.available);
    fixed = items.find((item) => !item.openPrice)!;
    open = items.find((item) => item.openPrice)!;
    publish.mockClear();
  });

  afterEach(() => {
    orders.onModuleDestroy();
    vi.useRealTimers();
  });

  describe('idempotency', () => {
    it('creates one order when the same key is sent twice', () => {
      const first = orders.place('key-00000001', orderOf());
      const second = orders.place('key-00000001', orderOf());

      expect(second).toEqual({ order: first.order, replayed: true });
      expect(orders.list()).toHaveLength(1);
      expect(publish).toHaveBeenCalledTimes(1);
    });

    it('rejects a reused key with a different cart', () => {
      orders.place('key-00000001', orderOf());
      expect(() => orders.place('key-00000001', orderOf({ discount: 100 }))).toThrow(
        expect.objectContaining({ status: 422 }),
      );
    });

    it('treats a new key as a new order', () => {
      orders.place('key-00000001', orderOf());
      orders.place('key-00000002', orderOf());
      expect(orders.list().map((order) => order.number)).toEqual([2, 1]);
    });
  });

  describe('stale cart', () => {
    it('rejects a price the menu no longer has, listing the change', () => {
      menu.updateItem(fixed.id, { price: (fixed.price ?? 0) + 100 });

      expect(() => orders.place('key-00000001', orderOf())).toThrow(
        expect.objectContaining({
          status: 409,
          response: expect.objectContaining({
            code: 'STALE_CART',
            details: {
              changes: [
                expect.objectContaining({
                  kind: 'priceChanged',
                  expected: fixed.price,
                  actual: (fixed.price ?? 0) + 100,
                }),
              ],
            },
          }),
        }),
      );
    });

    it('rejects an item that became unavailable', () => {
      menu.updateItem(fixed.id, { available: false });
      expect(() => orders.place('key-00000001', orderOf())).toThrow(
        expect.objectContaining({ status: 409 }),
      );
    });

    it('does not remember the key of a rejected order', () => {
      menu.updateItem(fixed.id, { available: false });
      expect(() => orders.place('key-00000001', orderOf())).toThrow();

      menu.updateItem(fixed.id, { available: true });
      expect(orders.place('key-00000001', orderOf()).replayed).toBe(false);
    });
  });

  describe('totals', () => {
    it('accepts any price for an open-price item and computes totals in cents', () => {
      const { order } = orders.place(
        'key-00000001',
        orderOf({ lines: [{ itemId: open.id, quantity: 3, unitPrice: 1250 }], discount: 500 }),
      );
      expect(order).toMatchObject({ subtotal: 3750, discount: 500, total: 3250 });
    });

    it('requires a price for an open-price item', () => {
      expect(() =>
        orders.place(
          'key-00000001',
          orderOf({ lines: [{ itemId: open.id, quantity: 1, unitPrice: 0 }] }),
        ),
      ).toThrow(expect.objectContaining({ status: 400 }));
    });

    it('rejects a discount larger than the subtotal', () => {
      expect(() => orders.place('key-00000001', orderOf({ discount: 1_000_000 }))).toThrow(
        expect.objectContaining({ status: 400 }),
      );
    });
  });

  describe('status', () => {
    it('advances automatically from received to completed', () => {
      const { order } = orders.place('key-00000001', orderOf());

      vi.advanceTimersByTime(AUTO_ADVANCE_MS.received!);
      expect(orders.list()[0].status).toBe('preparing');
      vi.advanceTimersByTime(AUTO_ADVANCE_MS.preparing!);
      expect(orders.list()[0].status).toBe('ready');
      vi.advanceTimersByTime(AUTO_ADVANCE_MS.ready!);
      expect(orders.list()[0].status).toBe('completed');
      expect(publish).toHaveBeenLastCalledWith({
        type: 'order.upserted',
        order: expect.objectContaining({ id: order.id, status: 'completed' }),
      });
    });

    it('stops advancing once an order is cancelled', () => {
      const { order } = orders.place('key-00000001', orderOf());
      orders.updateStatus(order.id, 'cancelled');

      vi.advanceTimersByTime(60_000);
      expect(orders.list()[0].status).toBe('cancelled');
    });

    it('rejects skipping a step', () => {
      const { order } = orders.place('key-00000001', orderOf());
      expect(() => orders.updateStatus(order.id, 'completed')).toThrow(
        expect.objectContaining({ status: 400 }),
      );
    });
  });
});
