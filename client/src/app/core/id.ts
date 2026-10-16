/**
 * `crypto.randomUUID` only exists in secure contexts (https or localhost). Opening the dev server
 * from a phone over the LAN is plain http, so fall back to `getRandomValues`, which works anywhere.
 */
export function createIdempotencyKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
