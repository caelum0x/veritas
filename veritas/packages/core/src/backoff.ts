// Exponential backoff delay computation with optional jitter.

/** Tuning parameters for exponential backoff. */
export interface BackoffOptions {
  /** Delay before the first retry, in ms. */
  readonly baseMs: number;
  /** Upper bound on any single delay, in ms. */
  readonly maxMs: number;
  /** Growth multiplier per attempt (>= 1). */
  readonly factor: number;
  /** Apply full random jitter in [0, computed]. */
  readonly jitter: boolean;
}

/** Sensible defaults: 100ms base, x2 growth, capped at 10s, jittered. */
export const DEFAULT_BACKOFF: BackoffOptions = {
  baseMs: 100,
  maxMs: 10_000,
  factor: 2,
  jitter: true,
};

/**
 * Compute the delay (ms) before the given zero-based retry attempt.
 * When `jitter` is enabled, a value in [0, delay] is returned.
 */
export function computeBackoff(
  attempt: number,
  options: BackoffOptions = DEFAULT_BACKOFF,
  random: () => number = Math.random,
): number {
  const raw = options.baseMs * options.factor ** Math.max(0, attempt);
  const capped = Math.min(options.maxMs, raw);
  return options.jitter ? Math.floor(random() * capped) : capped;
}

/** Resolve after `ms` milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}
