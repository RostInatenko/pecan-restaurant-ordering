import type { Order } from '@pecan/shared';
import { createEntityAdapter } from '@ngrx/entity';
import type { EntityState } from '@ngrx/entity';
import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { RealtimeActions } from '../realtime.actions';

export interface OrdersState extends EntityState<Order> {
  loaded: boolean;
}

const adapter = createEntityAdapter<Order>({ sortComparer: (a, b) => b.number - a.number });

const initialState: OrdersState = adapter.getInitialState({ loaded: false });

const ACTIVE_STATUSES = new Set<Order['status']>(['received', 'preparing', 'ready']);

export const ordersFeature = createFeature({
  name: 'orders',
  reducer: createReducer(
    initialState,
    on(RealtimeActions.snapshotReceived, (state, { orders }): OrdersState =>
      adapter.setAll(orders, { ...state, loaded: true }),
    ),
    on(RealtimeActions.orderUpserted, (state, { order }): OrdersState =>
      adapter.upsertOne(order, state),
    ),
  ),
  extraSelectors: ({ selectOrdersState }) => {
    const selectAllOrders = createSelector(selectOrdersState, adapter.getSelectors().selectAll);
    const selectActiveOrders = createSelector(selectAllOrders, (orders) =>
      orders.filter((order) => ACTIVE_STATUSES.has(order.status)),
    );
    return { selectAllOrders, selectActiveOrders };
  },
});
