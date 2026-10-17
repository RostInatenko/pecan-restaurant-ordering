import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { CartChange, Order, PlaceOrderRequest } from '@pecan/shared';
import { provideMockActions } from '@ngrx/effects/testing';
import type { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Subject, throwError } from 'rxjs';
import { OrdersApi } from '../../core/api/orders-api.service';
import type { AppError } from '../../core/http/app-error';
import { Notifier } from '../../core/notifier';
import { CheckoutActions } from './cart.actions';
import { cartFeature } from './cart.feature';
import type { CheckoutState } from './cart.feature';
import { lineKey } from './cart.logic';
import { CheckoutEffects } from './checkout.effects';

const request: PlaceOrderRequest = {
  lines: [{ itemId: 'item-1', quantity: 1, unitPrice: 1000 }],
  discount: 0,
};
const order: Order = {
  id: 'o1',
  number: 7,
  lines: [],
  subtotal: 1000,
  discount: 0,
  total: 1000,
  status: 'received',
  createdAt: '',
};
const idle: CheckoutState = { status: 'idle', idempotencyKey: null, changes: [], error: null };
const priceChange: CartChange = {
  kind: 'priceChanged',
  itemId: 'item-1',
  name: 'Burger',
  expected: 1000,
  actual: 1200,
};

describe('CheckoutEffects', () => {
  let actions$: Subject<Action>;
  let store: MockStore;
  let place: ReturnType<typeof vi.fn>;
  let effects: CheckoutEffects;

  beforeEach(() => {
    actions$ = new Subject<Action>();
    place = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        CheckoutEffects,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: OrdersApi, useValue: { place } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: Notifier, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
    store = TestBed.inject(MockStore);
    store.overrideSelector(cartFeature.selectCheckout, idle);
    store.overrideSelector(cartFeature.selectLines, [
      {
        key: lineKey('item-1', 1000),
        itemId: 'item-1',
        name: 'Burger',
        unitPrice: 1000,
        quantity: 1,
        openPrice: false,
      },
    ]);
    store.overrideSelector(cartFeature.selectLiveChanges, []);
    store.overrideSelector(cartFeature.selectOrderRequest, request);
    effects = TestBed.inject(CheckoutEffects);
  });

  const collect = (effect: keyof Pick<CheckoutEffects, 'confirm$' | 'submit$'>): Action[] => {
    const emitted: Action[] = [];
    effects[effect].subscribe((action) => emitted.push(action));
    return emitted;
  };

  describe('confirm$', () => {
    it('asks for a review when the live menu already shows changes', () => {
      store.overrideSelector(cartFeature.selectLiveChanges, [priceChange]);
      store.refreshState();
      const emitted = collect('confirm$');
      actions$.next(CheckoutActions.confirmed());
      expect(emitted).toEqual([CheckoutActions.reviewRequired({ changes: [priceChange] })]);
    });

    it('starts a new attempt with a fresh key', () => {
      const emitted = collect('confirm$');
      actions$.next(CheckoutActions.confirmed());
      expect(emitted).toEqual([
        CheckoutActions.submitStarted({ idempotencyKey: expect.any(String) as string }),
      ]);
    });

    it('reuses the key when retrying a failed attempt', () => {
      store.overrideSelector(cartFeature.selectCheckout, {
        ...idle,
        status: 'failed',
        idempotencyKey: 'key-1',
      });
      store.refreshState();
      const emitted = collect('confirm$');
      actions$.next(CheckoutActions.confirmed());
      expect(emitted).toEqual([CheckoutActions.submitStarted({ idempotencyKey: 'key-1' })]);
    });

    it('retries with the same key even if the menu changed meanwhile: the order may exist', () => {
      store.overrideSelector(cartFeature.selectCheckout, {
        ...idle,
        status: 'failed',
        idempotencyKey: 'key-1',
      });
      store.overrideSelector(cartFeature.selectLiveChanges, [priceChange]);
      store.refreshState();
      const emitted = collect('confirm$');
      actions$.next(CheckoutActions.confirmed());
      expect(emitted).toEqual([CheckoutActions.submitStarted({ idempotencyKey: 'key-1' })]);
    });

    it('does nothing while an order is already being submitted', () => {
      store.overrideSelector(cartFeature.selectCheckout, {
        ...idle,
        status: 'submitting',
        idempotencyKey: 'key-1',
      });
      store.refreshState();
      const emitted = collect('confirm$');
      actions$.next(CheckoutActions.confirmed());
      expect(emitted).toEqual([]);
    });
  });

  describe('submit$', () => {
    it('sends one request even if submit fires twice, then reports the order', () => {
      const response = new Subject<Order>();
      place.mockReturnValue(response);
      const emitted = collect('submit$');

      actions$.next(CheckoutActions.submitStarted({ idempotencyKey: 'key-1' }));
      actions$.next(CheckoutActions.submitStarted({ idempotencyKey: 'key-1' }));
      response.next(order);
      response.complete();

      expect(place).toHaveBeenCalledTimes(1);
      expect(place).toHaveBeenCalledWith('key-1', request);
      expect(emitted).toEqual([CheckoutActions.orderPlaced({ order })]);
    });

    it('turns a 409 from the server into a review', () => {
      const stale: AppError = {
        kind: 'conflict',
        status: 409,
        code: 'STALE_CART',
        message: 'changed',
        details: { changes: [priceChange] },
      };
      place.mockReturnValue(throwError(() => stale));
      const emitted = collect('submit$');
      actions$.next(CheckoutActions.submitStarted({ idempotencyKey: 'key-1' }));
      expect(emitted).toEqual([CheckoutActions.reviewRequired({ changes: [priceChange] })]);
    });

    it('reports a network failure as retryable', () => {
      const error: AppError = { kind: 'network', status: 0, message: 'offline' };
      place.mockReturnValue(throwError(() => error));
      const emitted = collect('submit$');
      actions$.next(CheckoutActions.submitStarted({ idempotencyKey: 'key-1' }));
      expect(emitted).toEqual([CheckoutActions.orderFailed({ error })]);
    });
  });
});
