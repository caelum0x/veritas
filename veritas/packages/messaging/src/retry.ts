// Retry policy — exponential backoff with jitter for message redelivery
import { sleep } from "@veritas/core";
import type { Logger } from "@veritas/observability";

export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  readonly backoffFactor: number;
  readonly jitterFactor: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 5,
  initialDelayMs: 250,
  maxDelayMs: 30_000,
  backoffFactor: 2,
  jitterFactor: 0.25,
};

export interface RetryContext {
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly lastError: unknown;
}

export type ShouldRetry = (ctx: RetryContext) => boolean;

export const alwaysRetry: ShouldRetry = ({ attempt, maxAttempts }) => attempt < maxAttempts;

export function computeRetryDelay(attempt: number, policy: RetryPolicy): number {
  const base = policy.initialDelayMs * Math.pow(policy.backoffFactor, attempt - 1);
  const capped = Math.min(base, policy.maxDelayMs);
  const jitter = capped * policy.jitterFactor * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(capped + jitter));
}

export interface RetryOptions<TErr> {
  readonly policy?: Partial<RetryPolicy>;
  readonly shouldRetry?: ShouldRetry;
  readonly logger?: Logger;
  readonly operationName?: string;
  readonly onRetry?: (ctx: RetryContext, delayMs: number) => void;
  readonly isRetryableError?: (err: TErr) => boolean;
}

/** Retry an async operation according to the given policy. */
export async function withMessageRetry<T, TErr>(
  fn: () => Promise<{ ok: true; value: T } | { ok: false; error: TErr }>,
  options: RetryOptions<TErr> = {}
): Promise<{ ok: true; value: T } | { ok: false; error: TErr }> {
  const policy: RetryPolicy = { ...DEFAULT_RETRY_POLICY, ...(options.policy ?? {}) };
  const shouldRetry = options.shouldRetry ?? alwaysRetry;
  const isRetryable = options.isRetryableError ?? (() => true);
  const name = options.operationName ?? "operation";

  let lastResult: { ok: true; value: T } | { ok: false; error: TErr } | undefined;

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    lastResult = await fn();

    if (lastResult.ok) return lastResult;

    const ctx: RetryContext = {
      attempt,
      maxAttempts: policy.maxAttempts,
      lastError: lastResult.error,
    };

    if (!isRetryable(lastResult.error) || !shouldRetry(ctx)) {
      options.logger?.warn("retry.exhausted", { name, attempt, reason: "non-retryable" });
      return lastResult;
    }

    if (attempt < policy.maxAttempts) {
      const delayMs = computeRetryDelay(attempt, policy);
      options.logger?.debug("retry.backoff", { name, attempt, delayMs });
      options.onRetry?.(ctx, delayMs);
      await sleep(delayMs);
    }
  }

  options.logger?.warn("retry.maxAttempts", { name, maxAttempts: policy.maxAttempts });
  return lastResult!;
}
