// Structured API error envelope mirroring RFC 7807 / @veritas/core ApiFailure shape.
export type ApiErrorBody = {
  readonly success: false;
  readonly data: null;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
};

export function makeApiError(
  code: string,
  message: string,
  details?: unknown,
): ApiErrorBody {
  return {
    success: false,
    data: null,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
}

export function makeValidationError(message: string, issues?: unknown): ApiErrorBody {
  return makeApiError("VALIDATION_ERROR", message, issues);
}

export function makeNotFoundError(message: string): ApiErrorBody {
  return makeApiError("NOT_FOUND", message);
}

export function makeConflictError(message: string): ApiErrorBody {
  return makeApiError("CONFLICT", message);
}

export function makeInternalError(message = "Internal server error"): ApiErrorBody {
  return makeApiError("INTERNAL_ERROR", message);
}
