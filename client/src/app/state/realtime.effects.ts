import { Injectable, inject } from '@angular/core';
import type { ServerMessage } from '@pecan/shared';
import { createEffect } from '@ngrx/effects';
import type { Action } from '@ngrx/store';
import { filter, map } from 'rxjs';
import { RealtimeService } from '../core/realtime/realtime.service';
import type { RealtimeEvent } from '../core/realtime/realtime.service';
import { RealtimeActions } from './realtime.actions';

@Injectable()
export class RealtimeEffects {
  private readonly realtime = inject(RealtimeService);

  /** Starts when the effects are registered (app start) and lives as long as the app. */
  readonly connect$ = createEffect(() => {
    return this.realtime.connect().pipe(
      map(toAction),
      filter((action): action is Action => action !== null),
    );
  });
}

function toAction(event: RealtimeEvent): Action | null {
  switch (event.type) {
    case 'connecting':
      return RealtimeActions.connecting({ attempt: event.attempt });
    case 'open':
      return RealtimeActions.opened();
    case 'closed':
      return RealtimeActions.closed({ retryInMs: event.retryInMs });
    case 'offline':
      return RealtimeActions.browserOffline();
    case 'resumed':
      return RealtimeActions.connectionResumed();
    case 'message':
      return messageToAction(event.message);
  }
}

function messageToAction(message: ServerMessage): Action | null {
  switch (message.type) {
    case 'snapshot':
      return RealtimeActions.snapshotReceived({ menu: message.menu, orders: message.orders });
    case 'category.upserted':
      return RealtimeActions.categoryUpserted({ category: message.category });
    case 'category.deleted':
      return RealtimeActions.categoryDeleted({ id: message.id });
    case 'item.upserted':
      return RealtimeActions.itemUpserted({ item: message.item });
    case 'item.deleted':
      return RealtimeActions.itemDeleted({ id: message.id });
    case 'order.upserted':
      return RealtimeActions.orderUpserted({ order: message.order });
    case 'ping':
      return null;
  }
}
