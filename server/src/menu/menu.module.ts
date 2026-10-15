import { Module } from '@nestjs/common';
import { RealtimeEventsModule } from '../realtime/realtime-events.module.js';
import { MenuController } from './menu.controller.js';
import { MenuService } from './menu.service.js';

@Module({
  imports: [RealtimeEventsModule],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
