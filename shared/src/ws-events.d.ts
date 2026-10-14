import type { Category, MenuItem } from './menu.js';
import type { Order } from './order.js';

/** Messages the server pushes over `/ws`. Deletions carry `rev` so late events can be ignored. */
export type ServerEvent =
  | { type: 'category.upserted'; category: Category }
  | { type: 'category.deleted'; id: string; rev: number }
  | { type: 'item.upserted'; item: MenuItem }
  | { type: 'item.deleted'; id: string; rev: number }
  | { type: 'order.upserted'; order: Order }
  | { type: 'ping' };

export type ServerEventType = ServerEvent['type'];
