import { Module } from '@nestjs/common';
import { ChaosConfig } from './chaos.config.js';
import { ChaosInterceptor } from './chaos.interceptor.js';

@Module({
  providers: [ChaosConfig, ChaosInterceptor],
  exports: [ChaosConfig, ChaosInterceptor],
})
export class ChaosModule {}
