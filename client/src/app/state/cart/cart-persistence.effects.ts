import { Injectable, inject } from '@angular/core';
import { createEffect } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { skip, tap } from 'rxjs';
import { cartFeature } from './cart.feature';
import { saveCart } from './cart.storage';

/** Writes the cart (including the pending idempotency key) to localStorage on every change. */
@Injectable()
export class CartPersistenceEffects {
  private readonly store = inject(Store);

  readonly persist$ = createEffect(
    () => {
      return this.store.select(cartFeature.selectCartState).pipe(
        skip(1),
        tap((cart) => saveCart(cart)),
      );
    },
    { dispatch: false },
  );
}
