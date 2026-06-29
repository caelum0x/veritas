// Retry backoff policies — exponential, linear, constant, and no-op
export interface BackoffPolicy {
  /** Return the delay in ms before the nth retry attempt (1-indexed). */
  nextDelay(attempt: number): number;
}

export interface ExponentialBackoffOptions {
  /** Base delay in ms (default: 500). */
  readonly baseMs?: number;
  /** Multiplier per attempt (default: 2). */
  readonly factor?: number;
  /** Maximum delay in ms (default: 30_000). */
  readonly maxMs?: number;
  /** Add random jitter up to jitterMs (default: 200). */
  readonly jitterMs?: number;
}

export function exponentialBackoff(opts: ExponentialBackoffOptions = {}): BackoffPolicy {
  const baseMs = opts.baseMs ?? 500;
  const factor = opts.factor ?? 2;
  const maxMs = opts.maxMs ?? 30_000;
  const jitterMs = opts.jitterMs ?? 200;
  return {
    nextDelay(attempt: number): number {
      const raw = baseMs * Math.pow(factor, attempt - 1);
      const capped = Math.min(raw, maxMs);
      const jitter = Math.random() * jitterMs;
      return Math.round(capped + jitter);
    },
  };
}

export interface LinearBackoffOptions {
  /** Step size in ms per attempt (default: 1_000). */
  readonly stepMs?: number;
  /** Maximum delay in ms (default: 30_000). */
  readonly maxMs?: number;
}

export function linearBackoff(opts: LinearBackoffOptions = {}): BackoffPolicy {
  const stepMs = opts.stepMs ?? 1_000;
  const maxMs = opts.maxMs ?? 30_000;
  return {
    nextDelay(attempt: number): number {
      return Math.min(stepMs * attempt, maxMs);
    },
  };
}

/** Constant delay between all retry attempts. */
export function constantBackoff(delayMs: number): BackoffPolicy {
  return {
    nextDelay(_attempt: number): number {
      return delayMs;
    },
  };
}

/** No delay between retry attempts (useful for tests). */
export function noBackoff(): BackoffPolicy {
  return {
    nextDelay(_attempt: number): number {
      return 0;
    },
  };
}
