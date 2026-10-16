import { Injectable } from '@nestjs/common';

/** Off unless the server starts with `CHAOS=1` (`npm run start:chaos`). */
@Injectable()
export class ChaosConfig {
  readonly enabled: boolean = process.env['CHAOS'] === '1';
  readonly minLatencyMs: number = 300;
  readonly maxLatencyMs: number = 1500;
  /** Share of requests rejected before the handler runs. */
  readonly failBeforeRate: number = 0.1;
  /** Share of requests whose handler ran but whose response is "lost", like a dropped connection. */
  readonly failAfterRate: number = 0.1;
  readonly socketDropIntervalMs: number = 20_000;
  readonly socketDropRate: number = 0.3;
  readonly random: () => number = Math.random;
}
