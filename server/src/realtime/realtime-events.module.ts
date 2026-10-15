import { Module } from '@nestjs/common';
import { RealtimeEvents } from './realtime-events.js';

@Module({
  providers: [RealtimeEvents],
  exports: [RealtimeEvents],
})
export class RealtimeEventsModule {}
