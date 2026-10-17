import type { CartState } from './cart.feature';
import { initialCartState } from './cart.feature';
import { isValidLine } from './cart.logic';

const STORAGE_KEY = 'pecan.cart.v1';

/**
 * Restores the cart after a reload. A reload in the middle of a submit leaves the outcome unknown,
 * so it comes back as "failed" with the same key: "Retry" then either places the order or returns
 * the one the server already created.
 */
export function loadCart(storage: Storage = localStorage): CartState {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null') as CartState | null;
    if (!parsed || !Array.isArray(parsed.lines) || typeof parsed.discount !== 'number') {
      return initialCartState;
    }
    const saved: CartState = { ...parsed, lines: parsed.lines.filter(isValidLine) };
    if (saved.checkout?.status !== 'submitting') return saved;
    return {
      ...saved,
      checkout: {
        ...saved.checkout,
        status: 'failed',
        error: {
          kind: 'network',
          status: 0,
          message: "We couldn't confirm your last order. Retry to check; it won't be placed twice.",
        },
      },
    };
  } catch {
    return initialCartState;
  }
}

export function saveCart(cart: CartState, storage: Storage = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Storage full or blocked (private mode): the cart still works, it just won't survive a reload.
  }
}
