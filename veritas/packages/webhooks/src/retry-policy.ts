// Exponential backoff retry policy for failed webhook deliveries.

export interface RetryPolicy {
  /** Maximum number of delivery attempts (including the initial one). */
  maxAttempts: number;
  /** Base delay in milliseconds before the first retry. */
  baseDelayMs: number;
  /** Multiplier applied to the delay after each attempt. */
  backoffFactor: number;
  /** Maximum delay cap in milliseconds. */
  maxDelayMs: number;
  /** Whether to add jitter to avoid thundering herd. */
  jitter: boolean;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 5,
  baseDelayMs: 1_000,
  backoffFactor: 2,
  maxDelayMs: 60_000,
  jitter: true,
};

/**
 * Compute the delay (in ms) before attempt number `attempt` (1-indexed).
 * attempt=1 is the initial delivery; attempt=2 is the first retry, etc.
 */
export function computeRetryDelayMs(attempt: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): number {
  if (attempt <= 1) return 0;
  const retryNumber = attempt - 1;
  const exponential = policy.baseDelayMs * Math.pow(policy.backoffFactor, retryNumber - 1);
  const capped = Math.min(exponential, policy.maxDelayMs);
  if (!policy.jitter) return capped;
  // Full jitter: random value in [0, capped]
  return Math.floor(Math.random() * capped);
}

/** Returns true if another attempt should be made after `attempt` failures. */
export function shouldRetry(attempt: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): boolean {
  return attempt < policy.maxAttempts;
}

/** Returns the absolute epoch ms timestamp for the next retry. */
export function nextRetryAt(attempt: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): number {
  return Date.now() + computeRetryDelayMs(attempt + 1, policy);
}

export function createRetryPolicy(overrides: Partial<RetryPolicy> = {}): RetryPolicy {
  return { ...DEFAULT_RETRY_POLICY, ...overrides };
}
