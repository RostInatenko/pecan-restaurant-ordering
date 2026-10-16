import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { ApiException } from '../common/api-exception.js';
import type { ChaosConfig } from './chaos.config.js';
import { ChaosInterceptor } from './chaos.interceptor.js';

const httpContext = { getType: () => 'http' } as ExecutionContext;

function setup(config: Partial<ChaosConfig>) {
  const handle = vi.fn(() => of('result'));
  const interceptor = new ChaosInterceptor({
    enabled: true,
    minLatencyMs: 0,
    maxLatencyMs: 0,
    failBeforeRate: 0,
    failAfterRate: 0,
    random: () => 0.5,
    ...config,
  } as ChaosConfig);
  const run = () => firstValueFrom(interceptor.intercept(httpContext, { handle } as CallHandler));
  return { handle, run };
}

describe('ChaosInterceptor', () => {
  it('does nothing when chaos mode is off', async () => {
    const { handle, run } = setup({ enabled: false, failBeforeRate: 1 });
    await expect(run()).resolves.toBe('result');
    expect(handle).toHaveBeenCalled();
  });

  it('can reject a request before the handler runs', async () => {
    const { handle, run } = setup({ failBeforeRate: 1 });
    await expect(run()).rejects.toBeInstanceOf(ApiException);
    expect(handle).not.toHaveBeenCalled();
  });

  it('can lose the response after the handler already ran', async () => {
    const { handle, run } = setup({ failAfterRate: 1 });
    await expect(run()).rejects.toBeInstanceOf(ApiException);
    expect(handle).toHaveBeenCalled();
  });
});
