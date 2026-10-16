import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-orders-page',
  template: `<p>Orders</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersPage {}
