import type { Cents } from './money.js';

export type ApiErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'STALE_CART'
  | 'IDEMPOTENCY_CONFLICT'
  | 'INTERNAL';

/** Body of every non-2xx response. */
export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

export type CartChange =
  | { kind: 'removed'; itemId: string }
  | { kind: 'unavailable'; itemId: string; name: string }
  | { kind: 'priceChanged'; itemId: string; name: string; expected: Cents; actual: Cents };

export interface StaleCartErrorBody extends ApiErrorBody {
  code: 'STALE_CART';
  details: { changes: CartChange[] };
}
