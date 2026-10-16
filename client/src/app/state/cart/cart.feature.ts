import type { CartChange, Cents, PlaceOrderRequest } from '@pecan/shared';
import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import type { AppError } from '../../core/http/app-error';
import { menuFeature } from '../menu/menu.feature';
import { CartActions, CheckoutActions } from './cart.actions';
import { applyChanges, clampQuantity, detectChanges, lineKey, mergeLines } from './cart.logic';
import type { CartLine } from './cart.logic';

export type CheckoutStatus = 'idle' | 'reviewing' | 'submitting' | 'failed';

export interface CheckoutState {
  status: CheckoutStatus;
  /** One key per checkout attempt. Kept across retries, cleared whenever the cart changes. */
  idempotencyKey: string | null;
  changes: CartChange[];
  error: AppError | null;
}

export interface CartState {
  lines: CartLine[];
  discount: Cents;
  checkout: CheckoutState;
}

const idleCheckout: CheckoutState = {
  status: 'idle',
  idempotencyKey: null,
  changes: [],
  error: null,
};

export const initialCartState: CartState = { lines: [], discount: 0, checkout: idleCheckout };

/** Any change to the cart contents starts a new checkout attempt, so it also drops the key. */
function changeCart(state: CartState, update: Partial<Omit<CartState, 'checkout'>>): CartState {
  if (state.checkout.status === 'submitting') return state;
  return { ...state, ...update, checkout: idleCheckout };
}

export const cartFeature = createFeature({
  name: 'cart',
  reducer: createReducer(
    initialCartState,
    on(CartActions.itemAdded, (state, { item, quantity, unitPrice }): CartState => {
      const line: CartLine = {
        key: lineKey(item.id, unitPrice),
        itemId: item.id,
        name: item.name,
        unitPrice,
        quantity: clampQuantity(quantity),
        openPrice: item.openPrice,
      };
      return changeCart(state, { lines: mergeLines([...state.lines, line]) });
    }),
    on(CartActions.quantityChanged, (state, { lineKey: key, quantity }): CartState => {
      const next = clampQuantity(quantity);
      const lines =
        next === 0
          ? state.lines.filter((line) => line.key !== key)
          : state.lines.map((line) => (line.key === key ? { ...line, quantity: next } : line));
      return changeCart(state, { lines });
    }),
    on(CartActions.lineRemoved, (state, { lineKey: key }): CartState =>
      changeCart(state, { lines: state.lines.filter((line) => line.key !== key) }),
    ),
    on(CartActions.discountChanged, (state, { discount }): CartState =>
      changeCart(state, { discount: Math.max(0, discount) }),
    ),
    on(CheckoutActions.reviewRequired, (state, { changes }): CartState => ({
      ...state,
      checkout: { ...state.checkout, status: 'reviewing', changes, error: null },
    })),
    on(CheckoutActions.changesAccepted, (state): CartState =>
      changeCart(
        { ...state, checkout: { ...state.checkout, status: 'idle' } },
        {
          lines: applyChanges(state.lines, state.checkout.changes),
        },
      ),
    ),
    on(CheckoutActions.reviewDismissed, (state): CartState => ({
      ...state,
      checkout: { ...state.checkout, status: 'idle', changes: [] },
    })),
    on(CheckoutActions.submitStarted, (state, { idempotencyKey }): CartState => ({
      ...state,
      checkout: { status: 'submitting', idempotencyKey, changes: [], error: null },
    })),
    on(CheckoutActions.orderPlaced, (): CartState => initialCartState),
    on(CheckoutActions.orderFailed, (state, { error }): CartState => ({
      ...state,
      checkout: {
        ...state.checkout,
        status: 'failed',
        error,
        // A key the server already tied to another cart can never succeed; start over.
        idempotencyKey:
          error.code === 'IDEMPOTENCY_CONFLICT' ? null : state.checkout.idempotencyKey,
      },
    })),
  ),
  extraSelectors: ({ selectLines, selectDiscount }) => {
    const selectSubtotal = createSelector(selectLines, (lines) =>
      lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    );
    const selectAppliedDiscount = createSelector(
      selectSubtotal,
      selectDiscount,
      (subtotal, discount) => Math.min(discount, subtotal),
    );
    const selectTotal = createSelector(
      selectSubtotal,
      selectAppliedDiscount,
      (subtotal, discount) => subtotal - discount,
    );
    const selectItemCount = createSelector(selectLines, (lines) =>
      lines.reduce((sum, line) => sum + line.quantity, 0),
    );
    const selectLiveChanges = createSelector(
      selectLines,
      menuFeature.selectItemEntities,
      detectChanges,
    );
    const selectChangesByItem = createSelector(
      selectLiveChanges,
      (changes): Readonly<Record<string, CartChange>> =>
        Object.fromEntries(changes.map((change) => [change.itemId, change])),
    );
    const selectOrderRequest = createSelector(
      selectLines,
      selectAppliedDiscount,
      (lines, discount): PlaceOrderRequest => ({
        lines: lines.map(({ itemId, quantity, unitPrice }) => ({ itemId, quantity, unitPrice })),
        discount,
      }),
    );
    return {
      selectSubtotal,
      selectAppliedDiscount,
      selectTotal,
      selectItemCount,
      selectLiveChanges,
      selectChangesByItem,
      selectOrderRequest,
    };
  },
});
