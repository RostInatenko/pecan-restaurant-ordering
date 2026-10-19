import type { Category, MenuItem, MenuSnapshot, Order } from '@pecan/shared';
import { createActionGroup, emptyProps, props } from '@ngrx/store';

/** Everything the WebSocket tells us. These are the only actions that put server data in the store. */
export const RealtimeActions = createActionGroup({
  source: 'Realtime',
  events: {
    Connecting: props<{ attempt: number }>(),
    Opened: emptyProps(),
    Closed: props<{ retryInMs: number }>(),
    'Browser Offline': emptyProps(),
    'Connection Resumed': emptyProps(),
    'Snapshot Received': props<{ menu: MenuSnapshot; orders: Order[] }>(),
    'Category Upserted': props<{ category: Category }>(),
    'Category Deleted': props<{ id: string }>(),
    'Item Upserted': props<{ item: MenuItem }>(),
    'Item Deleted': props<{ id: string }>(),
    'Order Upserted': props<{ order: Order }>(),
  },
});
