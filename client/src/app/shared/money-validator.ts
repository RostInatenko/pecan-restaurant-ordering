import type { ValidatorFn } from '@angular/forms';
import { parseMoney } from './money';

/** Same upper bound the server enforces on prices. */
export const MAX_PRICE_CENTS = 1_000_000;

/** Valid when empty (pair with `Validators.required`) or a money amount within the bounds. */
export function moneyValidator(minCents = 0, maxCents = MAX_PRICE_CENTS): ValidatorFn {
  return (control) => {
    const text = String(control.value ?? '').trim();
    if (!text) return null;
    const cents = parseMoney(text);
    return cents === null || cents < minCents || cents > maxCents ? { money: true } : null;
  };
}
