import type { CartChange, Cents, MenuItem } from '@pecan/shared';

export const MAX_QUANTITY = 99;

export interface CartLine {
  /** `itemId:unitPrice`, so an open-price item added at two prices becomes two lines. */
  key: string;
  itemId: string;
  name: string;
  unitPrice: Cents;
  quantity: number;
  openPrice: boolean;
}

export const lineKey = (itemId: string, unitPrice: Cents): string => `${itemId}:${unitPrice}`;

export const clampQuantity = (quantity: number): number =>
  Number.isFinite(quantity) ? Math.max(0, Math.min(MAX_QUANTITY, Math.floor(quantity))) : 0;

/** A line that could actually be ordered. Guards against bad input and corrupt saved carts. */
export function isValidLine(line: unknown): line is CartLine {
  if (typeof line !== 'object' || line === null) return false;
  const { key, itemId, unitPrice, quantity } = line as Partial<CartLine>;
  return (
    typeof key === 'string' &&
    typeof itemId === 'string' &&
    Number.isInteger(unitPrice) &&
    (unitPrice ?? -1) >= 0 &&
    Number.isInteger(quantity) &&
    (quantity ?? 0) >= 1 &&
    (quantity ?? 0) <= MAX_QUANTITY
  );
}

/** Combines lines that ended up with the same key, e.g. after a price update. */
export function mergeLines(lines: readonly CartLine[]): CartLine[] {
  const merged = new Map<string, CartLine>();
  for (const line of lines) {
    const existing = merged.get(line.key);
    merged.set(
      line.key,
      existing ? { ...existing, quantity: clampQuantity(existing.quantity + line.quantity) } : line,
    );
  }
  return [...merged.values()];
}

/** The same checks the server makes, run against the live menu so the cart can warn early. */
export function detectChanges(
  lines: readonly CartLine[],
  items: Readonly<Record<string, MenuItem | undefined>>,
): CartChange[] {
  const changes = new Map<string, CartChange>();
  for (const line of lines) {
    if (changes.has(line.itemId)) continue;
    const item = items[line.itemId];
    if (!item) {
      changes.set(line.itemId, { kind: 'removed', itemId: line.itemId });
    } else if (!item.available) {
      changes.set(line.itemId, { kind: 'unavailable', itemId: item.id, name: item.name });
    } else if (item.price !== null && item.price !== line.unitPrice) {
      changes.set(line.itemId, {
        kind: 'priceChanged',
        itemId: item.id,
        name: item.name,
        expected: line.unitPrice,
        actual: item.price,
      });
    }
  }
  return [...changes.values()];
}

/** What "Update my cart" does: drop what can't be ordered, take the new prices. */
export function applyChanges(
  lines: readonly CartLine[],
  changes: readonly CartChange[],
): CartLine[] {
  const byItem = new Map(changes.map((change) => [change.itemId, change]));
  const updated: CartLine[] = [];
  for (const line of lines) {
    const change = byItem.get(line.itemId);
    if (!change) {
      updated.push(line);
    } else if (change.kind === 'priceChanged') {
      updated.push({ ...line, unitPrice: change.actual, key: lineKey(line.itemId, change.actual) });
    }
  }
  return mergeLines(updated);
}
