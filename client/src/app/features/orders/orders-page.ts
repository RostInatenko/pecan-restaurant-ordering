import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { SkeletonRows } from '../../shared/skeleton-rows';
import { ordersFeature } from '../../state/orders/orders.feature';
import { OrderCard } from './order-card';

/** Statuses change on the server; the WebSocket events update the store and this list follows. */
@Component({
  selector: 'app-orders-page',
  imports: [MatButton, RouterLink, OrderCard, SkeletonRows],
  template: `
    <h1>Orders</h1>
    @if (!loaded()) {
      <app-skeleton-rows [count]="4" [height]="140" />
    } @else if (orders().length === 0) {
      <div class="empty">
        <p>No orders yet.</p>
        <a mat-flat-button routerLink="/menu">Go to the menu</a>
      </div>
    } @else {
      <div class="list">
        @for (order of orders(); track order.id) {
          <app-order-card [order]="order" />
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      max-width: 760px;
      margin: 0 auto;
      padding: 16px 16px 80px;
    }
    h1 {
      font: var(--mat-sys-headline-small);
    }
    .list {
      display: grid;
      gap: 12px;
    }
    .empty {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersPage {
  private readonly store = inject(Store);
  protected readonly loaded = this.store.selectSignal(ordersFeature.selectLoaded);
  protected readonly orders = this.store.selectSignal(ordersFeature.selectAllOrders);
}
