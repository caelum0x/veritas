// Application-level error types for HTTP responses.

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly code: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "Bad Request", details?: Record<string, unknown>) {
    super(400, message, "BAD_REQUEST", details);
    this.name = "BadRequestError";
  }
}

export class NotFoundHttpError extends HttpError {
  constructor(resource: string, id?: string) {
    const msg = id ? `${resource} '${id}' not found` : `${resource} not found`;
    super(404, msg, "NOT_FOUND");
    this.name = "NotFoundHttpError";
  }
}

export class ConflictHttpError extends HttpError {
  constructor(message: string) {
    super(409, message, "CONFLICT");
    this.name = "ConflictHttpError";
  }
}

export class UnprocessableEntityError extends HttpError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(422, message, "UNPROCESSABLE_ENTITY", details);
    this.name = "UnprocessableEntityError";
  }
}

export class TooManyRequestsError extends HttpError {
  constructor(message = "Too many requests") {
    super(429, message, "TOO_MANY_REQUESTS");
    this.name = "TooManyRequestsError";
  }
}

export class InternalHttpError extends HttpError {
  constructor(message = "Internal Server Error") {
    super(500, message, "INTERNAL_ERROR");
    this.name = "InternalHttpError";
  }
}

export function isHttpError(err: unknown): err is HttpError {
  return err instanceof HttpError;
}
