// withRetry: retry an async operation with exponential backoff.

import { computeBackoff, DEFAULT_BACKOFF, sleep, type BackoffOptions } from "./backoff.js";

/** Options controlling retry behavior. */
export interface RetryOptions {
  /** Maximum number of attempts (including the first). */
  readonly attempts: number;
  /** Backoff schedule between attempts. */
  readonly backoff: BackoffOptions;
  /** Decide whether a thrown error is retryable. Default: always retry. */
  readonly shouldRetry: (error: unknown, attempt: number) => boolean;
  /** Observe each failed attempt (e.g. for logging). */
  readonly onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

/** Default: 3 attempts, default backoff, retry every error. */
export const DEFAULT_RETRY: RetryOptions = {
  attempts: 3,
  backoff: DEFAULT_BACKOFF,
  shouldRetry: () => true,
};

/**
 * Run `fn`, retrying on failure up to `attempts` times with backoff delays.
 * Throws the last error once attempts are exhausted or `shouldRetry` is false.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULT_RETRY, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt < opts.attempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const isLast = attempt === opts.attempts - 1;
      if (isLast || !opts.shouldRetry(error, attempt)) break;
      const delay = computeBackoff(attempt, opts.backoff);
      opts.onRetry?.(error, attempt, delay);
      await sleep(delay);
    }
  }
  throw lastError;
}
