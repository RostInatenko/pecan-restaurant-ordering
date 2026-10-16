import { Logger, NotFoundException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { ApiException } from './api-exception.js';
import { ApiExceptionFilter } from './api-exception.filter.js';

function fakeHttpHost() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = {
    getType: () => 'http',
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('ApiExceptionFilter', () => {
  const filter = new ApiExceptionFilter();

  it('passes an ApiException body through unchanged', () => {
    const { host, status, json } = fakeHttpHost();
    filter.catch(new ApiException('STALE_CART', 'Changed', { changes: [] }), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      code: 'STALE_CART',
      message: 'Changed',
      details: { changes: [] },
    });
  });

  it('gives Nest HTTP errors a code', () => {
    const { host, status, json } = fakeHttpHost();
    filter.catch(new NotFoundException('Cannot GET /api/nope'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ code: 'NOT_FOUND', message: 'Cannot GET /api/nope' });
  });

  it('hides unexpected errors behind a generic 500', () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { host, status, json } = fakeHttpHost();
    filter.catch(new Error('database password is hunter2'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      code: 'INTERNAL',
      message: 'Something went wrong on the server',
    });
  });
});
