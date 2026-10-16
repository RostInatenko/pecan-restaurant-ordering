import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { ApiErrorBody, ApiErrorCode } from '@pecan/shared';
import type { Response } from 'express';

/**
 * Last line of defence: every error leaves the server as an `ApiErrorBody`. `ApiException`s pass
 * through untouched, Nest's own HTTP errors get a code, and anything unexpected becomes a generic
 * 500 whose details stay in the server log.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') return;
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.toApiError(exception);
    response.status(status).json(body);
  }

  private toApiError(exception: unknown): { status: number; body: ApiErrorBody } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      if (isApiErrorBody(payload)) return { status, body: payload };
      return { status, body: { code: codeForStatus(status), message: exception.message } };
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { code: 'INTERNAL', message: 'Something went wrong on the server' },
    };
  }
}

function codeForStatus(status: number): ApiErrorCode {
  if (status === 404) return 'NOT_FOUND';
  return status < 500 ? 'VALIDATION' : 'INTERNAL';
}

function isApiErrorBody(payload: unknown): payload is ApiErrorBody {
  return (
    typeof payload === 'object' && payload !== null && 'code' in payload && 'message' in payload
  );
}
