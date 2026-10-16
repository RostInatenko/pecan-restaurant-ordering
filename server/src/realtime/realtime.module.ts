import { Module } from '@nestjs/common';
import { MenuModule } from '../menu/menu.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { RealtimeEventsModule } from './realtime-events.module.js';
import { RealtimeGateway } from './realtime.gateway.js';

@Module({
  imports: [RealtimeEventsModule, MenuModule, OrdersModule],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}
