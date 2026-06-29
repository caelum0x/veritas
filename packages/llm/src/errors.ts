// LLM-specific error types extending the shared AppError hierarchy
import { AppError } from "@veritas/core";

/** Provider returned a refusal or content-policy block */
export class LLMRefusalError extends AppError {
  readonly kind = "LLMRefusal" as const;
  readonly providerName: string;

  constructor(message: string, providerName: string, cause?: unknown) {
    super("INTERNAL", 502, message, { cause });
    this.providerName = providerName;
  }
}

/** Provider hit its own rate limit */
export class LLMRateLimitError extends AppError {
  readonly kind = "LLMRateLimit" as const;
  readonly retryAfterMs: number;

  constructor(message: string, retryAfterMs: number, cause?: unknown) {
    super("RATE_LIMITED", 429, message, { cause });
    this.retryAfterMs = retryAfterMs;
  }
}

/** The LLM returned output that could not be parsed into the expected schema */
export class LLMParseError extends AppError {
  readonly kind = "LLMParse" as const;
  readonly rawOutput: string;

  constructor(message: string, rawOutput: string, cause?: unknown) {
    super("INTERNAL", 502, message, { cause, details: { rawOutput } });
    this.rawOutput = rawOutput;
  }
}

/** A generic upstream provider error (5xx, network, etc.) */
export class LLMUnavailableError extends AppError {
  readonly kind = "LLMUnavailable" as const;
  readonly providerName: string;

  constructor(message: string, providerName: string, cause?: unknown) {
    super("UNAVAILABLE", 503, message, { cause });
    this.providerName = providerName;
  }
}

/** Caller exceeded the token-bucket rate limit managed internally */
export class LLMLocalRateLimitError extends AppError {
  readonly kind = "LLMLocalRateLimit" as const;

  constructor(message: string) {
    super("RATE_LIMITED", 429, message);
  }
}
