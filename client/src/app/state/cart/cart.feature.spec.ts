import type { MenuItem } from '@pecan/shared';
import type { AppError } from '../../core/http/app-error';
import { CartActions, CheckoutActions } from './cart.actions';
import { cartFeature, initialCartState } from './cart.feature';
import type { CartState } from './cart.feature';

const burger: MenuItem = {
  id: 'item-1',
  categoryId: 'cat-01',
  name: 'Burger',
  description: '',
  price: 1000,
  openPrice: false,
  available: true,
};
const fish: MenuItem = {
  ...burger,
  id: 'item-2',
  name: 'Market fish',
  price: null,
  openPrice: true,
};
const networkError: AppError = { kind: 'network', status: 0, message: 'offline' };

const reduce = (...actions: Parameters<typeof cartFeature.reducer>[1][]): CartState =>
  actions.reduce(cartFeature.reducer, initialCartState);

describe('cart reducer', () => {
  it('adds open-price items at different prices as separate lines', () => {
    const state = reduce(
      CartActions.itemAdded({ item: fish, quantity: 1, unitPrice: 1500 }),
      CartActions.itemAdded({ item: fish, quantity: 1, unitPrice: 1800 }),
      CartActions.itemAdded({ item: fish, quantity: 2, unitPrice: 1500 }),
    );
    expect(state.lines.map((line) => [line.unitPrice, line.quantity])).toEqual([
      [1500, 3],
      [1800, 1],
    ]);
  });

  it('removes a line when its quantity drops to zero', () => {
    const added = reduce(CartActions.itemAdded({ item: burger, quantity: 1, unitPrice: 1000 }));
    const state = cartFeature.reducer(
      added,
      CartActions.quantityChanged({ lineKey: added.lines[0].key, quantity: 0 }),
    );
    expect(state.lines).toEqual([]);
  });

  describe('checkout attempt', () => {
    const submitting = reduce(
      CartActions.itemAdded({ item: burger, quantity: 1, unitPrice: 1000 }),
      CheckoutActions.submitStarted({ idempotencyKey: 'key-1' }),
    );

    it('ignores cart changes while an order is being submitted', () => {
      const state = cartFeature.reducer(
        submitting,
        CartActions.itemAdded({ item: burger, quantity: 1, unitPrice: 1000 }),
      );
      expect(state).toBe(submitting);
    });

    it('keeps the key after a failure so a retry reuses it', () => {
      const state = cartFeature.reducer(
        submitting,
        CheckoutActions.orderFailed({ error: networkError }),
      );
      expect(state.checkout).toMatchObject({ status: 'failed', idempotencyKey: 'key-1' });
    });

    it('drops the key when the cart changes after a failure', () => {
      const failed = cartFeature.reducer(
        submitting,
        CheckoutActions.orderFailed({ error: networkError }),
      );
      const state = cartFeature.reducer(failed, CartActions.discountChanged({ discount: 100 }));
      expect(state.checkout).toMatchObject({ status: 'idle', idempotencyKey: null });
    });

    it('drops a key the server tied to a different cart', () => {
      const state = cartFeature.reducer(
        submitting,
        CheckoutActions.orderFailed({
          error: { ...networkError, kind: 'validation', code: 'IDEMPOTENCY_CONFLICT' },
        }),
      );
      expect(state.checkout.idempotencyKey).toBeNull();
    });

    it('empties the cart once the order is placed', () => {
      const state = cartFeature.reducer(
        submitting,
        CheckoutActions.orderPlaced({
          order: {
            id: 'o1',
            number: 1,
            lines: [],
            subtotal: 1000,
            discount: 0,
            total: 1000,
            status: 'received',
            createdAt: '',
          },
        }),
      );
      expect(state).toEqual(initialCartState);
    });
  });

  it('applies accepted review changes and starts a fresh attempt', () => {
    const state = reduce(
      CartActions.itemAdded({ item: burger, quantity: 2, unitPrice: 1000 }),
      CheckoutActions.reviewRequired({
        changes: [
          { kind: 'priceChanged', itemId: burger.id, name: 'Burger', expected: 1000, actual: 1200 },
        ],
      }),
      CheckoutActions.changesAccepted(),
    );
    expect(state.lines[0]).toMatchObject({ unitPrice: 1200, quantity: 2 });
    expect(state.checkout).toMatchObject({ status: 'idle', idempotencyKey: null });
  });
});

describe('cart selectors', () => {
  it('caps the discount at the subtotal', () => {
    expect(cartFeature.selectAppliedDiscount.projector(1500, 2000)).toBe(1500);
    expect(cartFeature.selectTotal.projector(1500, 1500)).toBe(0);
  });

  it('builds the order request from the lines and the applied discount', () => {
    const lines = reduce(
      CartActions.itemAdded({ item: burger, quantity: 3, unitPrice: 1000 }),
    ).lines;
    expect(cartFeature.selectOrderRequest.projector(lines, 500)).toEqual({
      lines: [{ itemId: burger.id, quantity: 3, unitPrice: 1000 }],
      discount: 500,
    });
  });
});
