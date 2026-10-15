import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiErrorBody, ApiErrorCode } from '@pecan/shared';

const STATUS_BY_CODE: Record<ApiErrorCode, HttpStatus> = {
  VALIDATION: HttpStatus.BAD_REQUEST,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  STALE_CART: HttpStatus.CONFLICT,
  IDEMPOTENCY_CONFLICT: HttpStatus.UNPROCESSABLE_ENTITY,
  INTERNAL: HttpStatus.INTERNAL_SERVER_ERROR,
};

export class ApiException extends HttpException {
  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    const body: ApiErrorBody =
      details === undefined ? { code, message } : { code, message, details };
    super(body, STATUS_BY_CODE[code]);
  }

  static notFound(entity: string, id: string): ApiException {
    return new ApiException('NOT_FOUND', `${entity} "${id}" was not found`);
  }
}
