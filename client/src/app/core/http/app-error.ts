import type { HttpErrorResponse } from '@angular/common/http';
import type { ApiErrorBody, ApiErrorCode, CartChange } from '@pecan/shared';

export type AppErrorKind = 'network' | 'validation' | 'notFound' | 'conflict' | 'server';

/** What the rest of the app sees instead of a raw `HttpErrorResponse`. */
export interface AppError {
  kind: AppErrorKind;
  message: string;
  status: number;
  code?: ApiErrorCode;
  details?: unknown;
}

const FALLBACK_MESSAGES: Record<AppErrorKind, string> = {
  network: "Can't reach the server. Check your connection and try again.",
  validation: 'Some of the data was not accepted.',
  notFound: 'That no longer exists.',
  conflict: 'Something changed in the meantime.',
  server: 'The server had a problem. Please try again.',
};

export function toAppError(error: HttpErrorResponse): AppError {
  const kind = kindForStatus(error.status);
  const body = isApiErrorBody(error.error) ? error.error : undefined;
  const message = kind === 'network' || kind === 'server' ? FALLBACK_MESSAGES[kind] : body?.message;
  return {
    kind,
    status: error.status,
    message: message ?? FALLBACK_MESSAGES[kind],
    code: body?.code,
    details: body?.details,
  };
}

export function isAppError(value: unknown): value is AppError {
  return typeof value === 'object' && value !== null && 'kind' in value && 'message' in value;
}

/** The list of menu changes a `STALE_CART` (409) response carries, if this is one. */
export function staleCartChanges(error: AppError): CartChange[] | null {
  if (error.code !== 'STALE_CART') return null;
  const details = error.details as { changes?: CartChange[] } | undefined;
  return details?.changes ?? [];
}

function kindForStatus(status: number): AppErrorKind {
  if (status === 0) return 'network';
  if (status === 404) return 'notFound';
  if (status === 409) return 'conflict';
  if (status >= 400 && status < 500) return 'validation';
  return 'server';
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null && 'code' in value && 'message' in value;
}
