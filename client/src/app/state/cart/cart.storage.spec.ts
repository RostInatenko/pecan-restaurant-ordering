import { initialCartState } from './cart.feature';
import type { CartState } from './cart.feature';
import { loadCart, saveCart } from './cart.storage';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size;
    },
  };
}

describe('cart storage', () => {
  it('round-trips the cart', () => {
    const storage = memoryStorage();
    const cart: CartState = { ...initialCartState, discount: 250 };
    saveCart(cart, storage);
    expect(loadCart(storage)).toEqual(cart);
  });

  it('turns an interrupted submit into a retryable failure that keeps the key', () => {
    const storage = memoryStorage();
    saveCart(
      {
        ...initialCartState,
        checkout: { status: 'submitting', idempotencyKey: 'key-1', changes: [], error: null },
      },
      storage,
    );
    expect(loadCart(storage).checkout).toMatchObject({ status: 'failed', idempotencyKey: 'key-1' });
  });

  it('falls back to an empty cart when the stored data is broken', () => {
    const storage = memoryStorage();
    storage.setItem('pecan.cart.v1', '{not json');
    expect(loadCart(storage)).toEqual(initialCartState);
  });
});
