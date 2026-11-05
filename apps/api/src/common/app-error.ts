import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '@carely/shared';

const STATUS: Partial<Record<ErrorCode, number>> = {
  VALIDATION_FAILED: HttpStatus.BAD_REQUEST,
  UNAUTHENTICATED: HttpStatus.UNAUTHORIZED,
  INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  ACCOUNT_SUSPENDED: HttpStatus.FORBIDDEN,
  CSRF_FAILED: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  RATE_LIMITED: HttpStatus.TOO_MANY_REQUESTS,
  FILE_TOO_LARGE: HttpStatus.PAYLOAD_TOO_LARGE,
  FILE_TYPE_NOT_ALLOWED: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
  INTERNAL: HttpStatus.INTERNAL_SERVER_ERROR,
  STORAGE_NOT_CONFIGURED: HttpStatus.SERVICE_UNAVAILABLE,
  MAIL_NOT_CONFIGURED: HttpStatus.SERVICE_UNAVAILABLE,
};

/** Domain error carrying a stable, translatable code. */
export class AppError extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    public readonly params?: Record<string, string | number>,
    public readonly fields?: Record<string, string[]>,
    status?: number,
  ) {
    super({ code, params, fields }, status ?? STATUS[code] ?? HttpStatus.CONFLICT);
  }
}
