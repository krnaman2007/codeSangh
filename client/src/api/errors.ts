import type { ApiErrorDetail, ApiErrorPayload } from './types';

export const ERROR_CODE_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Please review the highlighted fields and try again.',
  EMAIL_TAKEN: 'An account with this email already exists.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  AUTH_REQUIRED: 'Your session has expired. Please sign in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested item could not be found.',
  NAME_CONFLICT: 'An item with this name already exists here.',
  LIMIT_EXCEEDED: 'You have reached the workspace limit for this resource.',
  INVALID_PARENT: 'The selected destination folder is not valid.',
  INVALID_MOVE: 'Cannot move a folder into itself or one of its subfolders.',
  LANGUAGE_NOT_SUPPORTED: 'The selected programming language is not supported.',
  LANGUAGE_NOT_RUNNABLE: 'This file language cannot be executed directly.',
  LANGUAGE_NOT_DEBUGGABLE: 'Debugging is not supported for this file language.',
  FILE_TOO_LARGE: 'File content exceeds the 1 MB maximum size limit.',
  CANNOT_SHARE_WITH_SELF: 'You are already the owner of this project.',
  USER_NOT_FOUND: 'No DevSync account was found with that email address.',
  ALREADY_COLLABORATOR: 'This user is already a collaborator on this project.',
  CANNOT_REMOVE_OWNER: 'Project owners cannot leave; delete the project instead.',
  RATE_LIMIT_EXCEEDED: 'Rate limit reached. Please wait a moment before trying again.',
  NETWORK_ERROR: 'Unable to reach the DevSync server. Check your connection and try again.',
  REQUEST_ABORTED: 'Request was cancelled.',
  SERVER_ERROR: 'Something went wrong on the server. Please try again.',
};

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetail[];
  readonly fieldErrors: Record<string, string>;

  constructor(params: {
    status: number;
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  }) {
    super(params.message);
    this.name = 'ApiClientError';
    this.status = params.status;
    this.code = params.code;
    this.details = params.details ?? [];
    this.fieldErrors = {};

    for (const detail of this.details) {
      if (detail.field && !this.fieldErrors[detail.field]) {
        this.fieldErrors[detail.field] = detail.message;
      }
    }
  }

  get userMessage(): string {
    return this.message || ERROR_CODE_MESSAGES[this.code] || ERROR_CODE_MESSAGES.SERVER_ERROR;
  }

  get isAuthError(): boolean {
    return this.status === 401 || this.code === 'AUTH_REQUIRED';
  }

  get isForbidden(): boolean {
    return this.status === 403 || this.code === 'FORBIDDEN';
  }

  get isNotFound(): boolean {
    return this.status === 404 || this.code === 'NOT_FOUND';
  }
}

export function normalizeApiErrorPayload(
  status: number,
  payload: unknown,
  fallbackMessage?: string
): ApiClientError {
  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    payload.error &&
    typeof payload.error === 'object'
  ) {
    const err = payload.error as Partial<ApiErrorPayload>;
    const code = typeof err.code === 'string' && err.code ? err.code : 'SERVER_ERROR';
    const message =
      (typeof err.message === 'string' && err.message) ||
      ERROR_CODE_MESSAGES[code] ||
      fallbackMessage ||
      ERROR_CODE_MESSAGES.SERVER_ERROR;
    const details = Array.isArray(err.details) ? err.details : [];
    return new ApiClientError({ status, code, message, details });
  }

  const code =
    status === 401
      ? 'AUTH_REQUIRED'
      : status === 403
      ? 'FORBIDDEN'
      : status === 404
      ? 'NOT_FOUND'
      : status === 429
      ? 'RATE_LIMIT_EXCEEDED'
      : 'SERVER_ERROR';

  return new ApiClientError({
    status,
    code,
    message: fallbackMessage || ERROR_CODE_MESSAGES[code],
  });
}

export function toApiClientError(err: unknown): ApiClientError {
  if (err instanceof ApiClientError) {
    return err;
  }
  if (err instanceof DOMException && err.name === 'AbortError') {
    return new ApiClientError({
      status: 0,
      code: 'REQUEST_ABORTED',
      message: ERROR_CODE_MESSAGES.REQUEST_ABORTED,
    });
  }
  if (err instanceof Error) {
    return new ApiClientError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: err.message || ERROR_CODE_MESSAGES.NETWORK_ERROR,
    });
  }
  return new ApiClientError({
    status: 0,
    code: 'SERVER_ERROR',
    message: ERROR_CODE_MESSAGES.SERVER_ERROR,
  });
}
