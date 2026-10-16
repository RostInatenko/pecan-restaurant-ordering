import type { Cents } from '@pecan/shared';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Division happens only here, for display. Everything else stays in integer cents. */
export function formatMoney(cents: Cents): string {
  return usd.format(cents / 100);
}

const MONEY_PATTERN = /^\s*\$?\s*(\d{1,6})(?:\.(\d{1,2}))?\s*$/;

/** Parses "12", "12.5" or "$12.50" into cents without going through a float. */
export function parseMoney(text: string): Cents | null {
  const match = MONEY_PATTERN.exec(text);
  if (!match) return null;
  const [, dollars, fraction = ''] = match;
  return Number(dollars) * 100 + Number(fraction.padEnd(2, '0'));
}

/** Cents → the text a money input should show, e.g. 1250 → "12.50". */
export function centsToInput(cents: Cents | null): string {
  if (cents === null) return '';
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}
