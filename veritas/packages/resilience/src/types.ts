// Shared option types for all resilience policies.

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit. */
  readonly failureThreshold?: number;
  /** Number of consecutive successes in HALF_OPEN before closing. */
  readonly successThreshold?: number;
  /** Max concurrent calls allowed while in HALF_OPEN state. */
  readonly halfOpenMaxCalls?: number;
  /** Duration in ms the circuit stays OPEN before trying HALF_OPEN. */
  readonly resetTimeoutMs?: number;
  /** Human-readable name for observability. */
  readonly name?: string;
}

export interface BulkheadOptions {
  /** Maximum number of concurrent executions allowed. */
  readonly maxConcurrency: number;
  /** Maximum number of calls that may queue waiting for a slot (default 0 = no queue). */
  readonly maxQueue?: number;
  /** Human-readable name for observability. */
  readonly name?: string;
}

export interface TimeoutOptions {
  /** Timeout duration in milliseconds. */
  readonly timeoutMs: number;
}

export interface RetryBudgetOptions {
  /** Total retries allowed within the window. */
  readonly budget: number;
  /** Window length in milliseconds (default 60_000). */
  readonly windowMs?: number;
  /** Human-readable name for observability. */
  readonly name?: string;
}

export interface FallbackOptions<T> {
  /** Synchronous fallback value or async factory. */
  readonly fallback: T | (() => T | Promise<T>);
  /** If provided, only invoke fallback when predicate returns true for the error. */
  readonly when?: (error: unknown) => boolean;
}

export interface HedgeOptions {
  /** Delay in ms before launching each subsequent hedge attempt. */
  readonly delayMs: number;
  /** Max total concurrent attempts (default 2 = original + 1 hedge). */
  readonly maxAttempts?: number;
}

export interface RateGuardOptions {
  /** Max calls allowed per window. */
  readonly limit: number;
  /** Window length in milliseconds. */
  readonly windowMs: number;
  /** Human-readable name for error context. */
  readonly name?: string;
}
