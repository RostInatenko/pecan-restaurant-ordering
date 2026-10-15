import type { Category, MenuItem, MenuSnapshot } from './menu.js';
import type { Order } from './order.js';

/**
 * Messages the server pushes over `/ws`. The first message on every connection is a `snapshot`;
 * everything after it is a change on top of that snapshot, delivered in order.
 */
export type ServerMessage =
  | { type: 'snapshot'; menu: MenuSnapshot; orders: Order[] }
  | { type: 'category.upserted'; category: Category }
  | { type: 'category.deleted'; id: string }
  | { type: 'item.upserted'; item: MenuItem }
  | { type: 'item.deleted'; id: string }
  | { type: 'order.upserted'; order: Order }
  | { type: 'ping' };

export type ServerMessageType = ServerMessage['type'];

/** Every message except the snapshot and heartbeat: a single change the server broadcasts. */
export type ServerEvent = Exclude<ServerMessage, { type: 'snapshot' } | { type: 'ping' }>;
