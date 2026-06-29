// Retry-with-backoff wrapper for Transport requests, respecting Retry-After headers.
import { isOk } from "@veritas/core";
import type { Result, BackoffOptions } from "@veritas/core";
import { sleep, computeBackoff } from "@veritas/core";
import type { Transport, RequestOptions, RawResponse } from "./transport.js";
import { SdkHttpError } from "./errors.js";

export interface RetryConfig {
  maxRetries: number;
  /** Base delay in ms for exponential backoff (default: 500) */
  baseDelayMs?: number;
  /** Maximum delay cap in ms (default: 30000) */
  maxDelayMs?: number;
}

const RETRYABLE_CODES = new Set<string>([
  "network_error",
  "timeout",
  "rate_limited",
  "server_error",
]);

function isRetryable(error: SdkHttpError): boolean {
  return RETRYABLE_CODES.has(error.code);
}

function delayForAttempt(attempt: number, cfg: Required<RetryConfig>): number {
  if (cfg.maxRetries === 0) return 0;
  const backoffOpts: BackoffOptions = {
    baseMs: cfg.baseDelayMs,
    maxMs: cfg.maxDelayMs,
    factor: 2,
    jitter: true,
  };
  return computeBackoff(attempt, backoffOpts);
}

/** Wraps a Transport.request call with retry logic. */
export async function withRetryTransport(
  transport: Transport,
  options: RequestOptions,
  config: RetryConfig,
): Promise<Result<RawResponse, SdkHttpError>> {
  const cfg: Required<RetryConfig> = {
    maxRetries: config.maxRetries,
    baseDelayMs: config.baseDelayMs ?? 500,
    maxDelayMs: config.maxDelayMs ?? 30_000,
  };

  let lastResult: Result<RawResponse, SdkHttpError> | undefined;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    const result = await transport.request(options);

    if (isOk(result)) {
      return result;
    }

    lastResult = result;
    const error = result.error;

    if (!isRetryable(error) || attempt === cfg.maxRetries) {
      return result;
    }

    // Honor Retry-After header for rate limiting
    const delay =
      error.code === "rate_limited" && error.retryAfterMs !== undefined
        ? error.retryAfterMs
        : delayForAttempt(attempt, cfg);

    await sleep(delay);
  }

  return lastResult!;
}
