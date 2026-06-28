// SDK-specific HTTP error classes surfaced to callers.

export type SdkErrorCode =
  | "network_error"
  | "timeout"
  | "rate_limited"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation_error"
  | "server_error"
  | "unknown";

export class SdkHttpError extends Error {
  readonly code: SdkErrorCode;
  readonly status: number | undefined;
  readonly requestId: string | undefined;
  readonly retryAfterMs: number | undefined;

  constructor(opts: {
    message: string;
    code: SdkErrorCode;
    status?: number;
    requestId?: string;
    retryAfterMs?: number;
    cause?: unknown;
  }) {
    super(opts.message, { cause: opts.cause });
    this.name = "SdkHttpError";
    this.code = opts.code;
    this.status = opts.status;
    this.requestId = opts.requestId;
    this.retryAfterMs = opts.retryAfterMs;
  }
}

export class SdkNetworkError extends SdkHttpError {
  constructor(message: string, cause?: unknown) {
    super({ message, code: "network_error", cause });
    this.name = "SdkNetworkError";
  }
}

export class SdkTimeoutError extends SdkHttpError {
  constructor(timeoutMs: number) {
    super({ message: `Request timed out after ${timeoutMs}ms`, code: "timeout" });
    this.name = "SdkTimeoutError";
  }
}

export class SdkRateLimitedError extends SdkHttpError {
  constructor(retryAfterMs: number, requestId?: string) {
    super({
      message: `Rate limited. Retry after ${retryAfterMs}ms`,
      code: "rate_limited",
      status: 429,
      requestId,
      retryAfterMs,
    });
    this.name = "SdkRateLimitedError";
  }
}

export function statusToCode(status: number): SdkErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 422) return "validation_error";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server_error";
  return "unknown";
}
