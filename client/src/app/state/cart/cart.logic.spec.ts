import type { MenuItem } from '@pecan/shared';
import { applyChanges, detectChanges, lineKey, mergeLines } from './cart.logic';
import type { CartLine } from './cart.logic';

const line = (itemId: string, unitPrice: number, quantity = 1, openPrice = false): CartLine => ({
  key: lineKey(itemId, unitPrice),
  itemId,
  name: itemId,
  unitPrice,
  quantity,
  openPrice,
});

const item = (id: string, overrides: Partial<MenuItem> = {}): MenuItem => ({
  id,
  categoryId: 'cat-01',
  name: id,
  description: '',
  price: 500,
  openPrice: false,
  available: true,
  ...overrides,
});

describe('cart logic', () => {
  it('merges lines with the same key and caps the quantity', () => {
    expect(mergeLines([line('a', 500, 60), line('a', 500, 60), line('b', 300)])).toEqual([
      line('a', 500, 99),
      line('b', 300),
    ]);
  });

  it('keeps an open-price item at two prices as two lines', () => {
    expect(mergeLines([line('a', 500, 1, true), line('a', 700, 1, true)])).toHaveLength(2);
  });

  describe('detectChanges', () => {
    it('reports removed, unavailable and repriced items', () => {
      const changes = detectChanges([line('gone', 500), line('off', 500), line('pricey', 500)], {
        off: item('off', { available: false }),
        pricey: item('pricey', { price: 650 }),
      });
      expect(changes).toEqual([
        { kind: 'removed', itemId: 'gone' },
        { kind: 'unavailable', itemId: 'off', name: 'off' },
        { kind: 'priceChanged', itemId: 'pricey', name: 'pricey', expected: 500, actual: 650 },
      ]);
    });

    it('accepts any price for an open-price item', () => {
      expect(
        detectChanges([line('a', 1234, 1, true)], {
          a: item('a', { price: null, openPrice: true }),
        }),
      ).toEqual([]);
    });
  });

  it('applies changes: drops what cannot be ordered and takes new prices', () => {
    const updated = applyChanges(
      [line('off', 500), line('pricey', 500, 2), line('fine', 300)],
      [
        { kind: 'unavailable', itemId: 'off', name: 'off' },
        { kind: 'priceChanged', itemId: 'pricey', name: 'pricey', expected: 500, actual: 650 },
      ],
    );
    expect(updated).toEqual([line('pricey', 650, 2), line('fine', 300)]);
  });
});
