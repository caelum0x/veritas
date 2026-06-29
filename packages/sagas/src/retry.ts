// Step retry: exponential back-off with jitter for transient step failures.
import { isOk, sleep, type Result } from "@veritas/core";
import type { StepRetryPolicy } from "./step.js";

/** Compute exponential back-off with full random jitter, capped at policy.maxDelayMs. */
function backoffMs(attempt: number, policy: StepRetryPolicy): number {
  const exponential = policy.baseDelayMs * 2 ** attempt;
  const jitter = Math.random() * policy.baseDelayMs;
  return Math.min(exponential + jitter, policy.maxDelayMs);
}

/** Details passed to the optional observer on each failed attempt. */
export interface RetryAttemptEvent<E = unknown> {
  readonly stepName: string;
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly delayMs: number;
  readonly error: E;
}

/**
 * Execute `fn` up to `policy.maxAttempts` times with exponential back-off.
 * Returns the first Ok result or the last Err after exhausting retries.
 */
export async function withStepRetry<T, E = unknown>(
  stepName: string,
  fn: () => Promise<Result<T, E>>,
  policy: StepRetryPolicy,
  onRetry?: (event: RetryAttemptEvent<E>) => void,
): Promise<Result<T, E>> {
  let last!: Result<T, E>;
  for (let attempt = 0; attempt < policy.maxAttempts; attempt++) {
    last = await fn();
    if (isOk(last)) return last;
    if (attempt < policy.maxAttempts - 1) {
      const delayMs = backoffMs(attempt, policy);
      onRetry?.({ stepName, attempt: attempt + 1, maxAttempts: policy.maxAttempts, delayMs, error: last.error });
      await sleep(delayMs);
    }
  }
  return last;
}
