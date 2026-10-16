import { Injectable } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { mergeMap, tap, timer } from 'rxjs';
import type { Observable } from 'rxjs';
import { ApiException } from '../common/api-exception.js';
import { ChaosConfig } from './chaos.config.js';

const simulatedFailure = (): ApiException =>
  new ApiException('INTERNAL', 'Simulated server failure (CHAOS mode)');

@Injectable()
export class ChaosInterceptor implements NestInterceptor {
  constructor(private readonly chaos: ChaosConfig) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.chaos.enabled || context.getType() !== 'http') return next.handle();

    const { minLatencyMs, maxLatencyMs, failBeforeRate, failAfterRate, random } = this.chaos;
    const latency = minLatencyMs + random() * (maxLatencyMs - minLatencyMs);

    return timer(latency).pipe(
      mergeMap(() => {
        if (random() < failBeforeRate) throw simulatedFailure();
        return next.handle();
      }),
      tap(() => {
        if (random() < failAfterRate) throw simulatedFailure();
      }),
    );
  }
}
