import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import type { Action } from '@ngrx/store';
import { catchError, exhaustMap, filter, map, of, tap } from 'rxjs';
import { OrdersApi } from '../../core/api/orders-api.service';
import { isAppError, staleCartChanges } from '../../core/http/app-error';
import type { AppError } from '../../core/http/app-error';
import { createIdempotencyKey } from '../../core/id';
import { Notifier } from '../../core/notifier';
import { CheckoutActions } from './cart.actions';
import { cartFeature } from './cart.feature';

@Injectable()
export class CheckoutEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(OrdersApi);
  private readonly router = inject(Router);
  private readonly notifier = inject(Notifier);

  /**
   * A retry of a failed attempt goes straight back to the server with the same key: the order may
   * already exist, and only the server can tell (it replays it, or answers 409 if the menu changed).
   * A new attempt is reviewed first if the live menu already shows changes.
   */
  readonly confirm$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(CheckoutActions.confirmed),
      concatLatestFrom(() => [
        this.store.select(cartFeature.selectCheckout),
        this.store.select(cartFeature.selectLines),
        this.store.select(cartFeature.selectLiveChanges),
      ]),
      filter(([, checkout, lines]) => checkout.status !== 'submitting' && lines.length > 0),
      map(([, checkout, , changes]) => {
        if (checkout.status === 'failed' && checkout.idempotencyKey) {
          return CheckoutActions.submitStarted({ idempotencyKey: checkout.idempotencyKey });
        }
        return changes.length > 0
          ? CheckoutActions.reviewRequired({ changes })
          : CheckoutActions.submitStarted({ idempotencyKey: createIdempotencyKey() });
      }),
    );
  });

  /** `exhaustMap` ignores new submits while one is in flight: the last line of double-click defence. */
  readonly submit$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(CheckoutActions.submitStarted),
      concatLatestFrom(() => this.store.select(cartFeature.selectOrderRequest)),
      exhaustMap(([{ idempotencyKey }, request]) =>
        this.api.place(idempotencyKey, request).pipe(
          map((order) => CheckoutActions.orderPlaced({ order })),
          catchError((error: unknown) => of(failureAction(error))),
        ),
      ),
    );
  });

  readonly placed$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(CheckoutActions.orderPlaced),
        tap(({ order }) => {
          this.notifier.success(`Order #${order.number} placed`);
          void this.router.navigate(['/orders']);
        }),
      );
    },
    { dispatch: false },
  );
}

/** A 409 means the menu changed under the cart: back to review. Anything else can be retried. */
function failureAction(error: unknown): Action {
  const appError: AppError = isAppError(error)
    ? error
    : { kind: 'server', status: 0, message: 'Something went wrong. Please try again.' };
  const changes = staleCartChanges(appError);
  return changes
    ? CheckoutActions.reviewRequired({ changes })
    : CheckoutActions.orderFailed({ error: appError });
}
