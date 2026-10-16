import type { CartChange, Cents, MenuItem, Order } from '@pecan/shared';
import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { AppError } from '../../core/http/app-error';

export const CartActions = createActionGroup({
  source: 'Cart',
  events: {
    'Item Added': props<{ item: MenuItem; quantity: number; unitPrice: Cents }>(),
    'Quantity Changed': props<{ lineKey: string; quantity: number }>(),
    'Line Removed': props<{ lineKey: string }>(),
    'Discount Changed': props<{ discount: Cents }>(),
  },
});

export const CheckoutActions = createActionGroup({
  source: 'Checkout',
  events: {
    /** "Place order" or "Retry". The effect decides between review and submit. */
    Confirmed: emptyProps(),
    'Review Required': props<{ changes: CartChange[] }>(),
    'Changes Accepted': emptyProps(),
    'Review Dismissed': emptyProps(),
    'Submit Started': props<{ idempotencyKey: string }>(),
    'Order Placed': props<{ order: Order }>(),
    'Order Failed': props<{ error: AppError }>(),
  },
});
