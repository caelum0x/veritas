// Gateway retry policy: exponential backoff with jitter for upstream requests.
import { computeBackoff, sleep, type BackoffOptions } from "@veritas/core";

export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly backoff: BackoffOptions;
  readonly retryOn: ReadonlyArray<number>;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoff: { baseMs: 200, factor: 2, maxMs: 5000, jitter: true },
  retryOn: [502, 503, 504],
};

export type AttemptFn<T> = (attempt: number) => Promise<T>;

export interface RetryResult<T> {
  readonly value: T;
  readonly attempts: number;
}

export async function withGatewayRetry<T>(
  fn: AttemptFn<T>,
  shouldRetry: (value: T, attempt: number) => boolean,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
): Promise<RetryResult<T>> {
  let attempt = 0;
  while (true) {
    attempt++;
    const value = await fn(attempt);
    if (!shouldRetry(value, attempt) || attempt >= policy.maxAttempts) {
      return { value, attempts: attempt };
    }
    const delay = computeBackoff(attempt - 1, policy.backoff);
    await sleep(delay);
  }
}

export function isRetryableStatus(
  status: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
): boolean {
  return policy.retryOn.includes(status);
}
