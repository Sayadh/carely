/** Stable API error codes. The web app translates them; the API never sends localized sentences. */
export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'CSRF_FAILED',
  'INTERNAL',
  'INVALID_CREDENTIALS',
  'ACCOUNT_SUSPENDED',
  'EMAIL_TAKEN',
  'RESET_TOKEN_INVALID',
  'INVALID_TRANSITION',
  'REQUEST_EXPIRED',
  'SCHEDULE_CONFLICT',
  'PROFESSIONAL_UNAVAILABLE',
  'START_IN_PAST',
  'END_BEFORE_START',
  'DURATION_TOO_LONG',
  'RECURRENCE_TOO_LONG',
  'RECURRENCE_EMPTY',
  'SERVICE_NOT_OFFERED',
  'LOCATION_NOT_SERVED',
  'SELF_REQUEST',
  'TOO_EARLY_TO_COMPLETE',
  'REVIEW_NOT_ELIGIBLE',
  'REVIEW_EXISTS',
  'PROFILE_INCOMPLETE',
  'PROFILE_NOT_EDITABLE',
  'FILE_TOO_LARGE',
  'FILE_TYPE_NOT_ALLOWED',
  'IN_USE',
  'STORAGE_NOT_CONFIGURED',
  'MAIL_NOT_CONFIGURED',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    params?: Record<string, string | number>;
    fields?: Record<string, string[]>;
    requestId?: string;
  };
}
