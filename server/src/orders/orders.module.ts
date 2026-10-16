import { Module } from '@nestjs/common';
import { MenuModule } from '../menu/menu.module.js';
import { RealtimeEventsModule } from '../realtime/realtime-events.module.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [RealtimeEventsModule, MenuModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
