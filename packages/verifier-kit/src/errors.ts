// errors.ts: domain-specific errors for verifier-kit operations.
import { AppError, type AppErrorOptions } from "@veritas/core";

export class VerifierNotFoundError extends AppError {
  constructor(verifierId: string, opts?: AppErrorOptions) {
    super("NOT_FOUND", 404, `No verifier found for id: ${verifierId}`, {
      details: { verifierId },
      ...opts,
    });
  }
}

export class NoVerifierAvailableError extends AppError {
  constructor(claimType: string, opts?: AppErrorOptions) {
    super("UNAVAILABLE", 422, `No verifier can handle claim type: ${claimType}`, {
      details: { claimType },
      ...opts,
    });
  }
}

export class VerifierTimeoutError extends AppError {
  constructor(verifierId: string, timeoutMs: number, opts?: AppErrorOptions) {
    super("UNAVAILABLE", 504, `Verifier ${verifierId} timed out after ${timeoutMs}ms`, {
      details: { verifierId, timeoutMs },
      ...opts,
    });
  }
}

export class SourceUnavailableError extends AppError {
  constructor(sourceId: string, reason?: string, opts?: AppErrorOptions) {
    super("UNAVAILABLE", 503, `Source ${sourceId} is unavailable${reason ? `: ${reason}` : ""}`, {
      details: { sourceId, reason },
      ...opts,
    });
  }
}

export class RateLimitExceededError extends AppError {
  constructor(sourceId: string, retryAfterMs?: number, opts?: AppErrorOptions) {
    super("RATE_LIMITED", 429, `Rate limit exceeded for source: ${sourceId}`, {
      details: { sourceId, retryAfterMs },
      ...opts,
    });
  }
}

export class CacheWriteError extends AppError {
  constructor(key: string, cause?: unknown, opts?: AppErrorOptions) {
    super("INTERNAL", 500, `Failed to write cache entry for key: ${key}`, {
      details: { key },
      cause: cause instanceof Error ? cause : undefined,
      ...opts,
    });
  }
}

export class VerifierResultInvalidError extends AppError {
  constructor(verifierId: string, message: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, `Verifier ${verifierId} produced invalid result: ${message}`, {
      details: { verifierId, message },
      ...opts,
    });
  }
}
