// Retry budget: tracks retries within a sliding window and rejects excess retry attempts.
import { Result, ok, err } from "@veritas/core";
import { RetryBudgetExhaustedError } from "./errors.js";
import type { RetryBudgetOptions } from "./types.js";

interface BudgetState {
  readonly usedRetries: number;
  readonly windowStart: number;
}

/**
 * Tracks how many retries have been spent in the current window.
 * Call `consume()` before each retry attempt; returns err when budget is exhausted.
 * Call `execute()` to run fn and automatically spend a retry token on failure.
 */
export class RetryBudget {
  private state: BudgetState;
  private readonly opts: Required<RetryBudgetOptions>;

  constructor(opts: RetryBudgetOptions) {
    this.opts = {
      budget: opts.budget,
      windowMs: opts.windowMs ?? 60_000,
      name: opts.name ?? "retry-budget",
    };
    this.state = { usedRetries: 0, windowStart: Date.now() };
  }

  /** Remaining retries in the current window. */
  get remaining(): number {
    this.maybeReset();
    return this.opts.budget - this.state.usedRetries;
  }

  /**
   * Spend one retry token. Returns ok(true) when granted, err when budget is empty.
   */
  consume(): Result<true, RetryBudgetExhaustedError> {
    this.maybeReset();
    if (this.state.usedRetries >= this.opts.budget) {
      return err(new RetryBudgetExhaustedError(this.opts.name));
    }
    this.state = { ...this.state, usedRetries: this.state.usedRetries + 1 };
    return ok(true);
  }

  /**
   * Execute fn; if it throws, attempt to spend a retry token and call onRetry.
   * If no budget remains, returns err(RetryBudgetExhaustedError).
   * For multi-attempt retry loops, combine with @veritas/core withRetry and call
   * consume() per attempt.
   */
  async execute<T>(
    fn: () => Promise<T>,
    onRetry?: (error: unknown) => Promise<void>
  ): Promise<Result<T, RetryBudgetExhaustedError | unknown>> {
    try {
      return ok(await fn());
    } catch (firstError) {
      const token = this.consume();
      if (!token.ok) return token as Result<T, RetryBudgetExhaustedError>;

      if (onRetry !== undefined) {
        await onRetry(firstError);
      }

      try {
        return ok(await fn());
      } catch (retryError) {
        return err(retryError);
      }
    }
  }

  private maybeReset(): void {
    const now = Date.now();
    if (now - this.state.windowStart >= this.opts.windowMs) {
      this.state = { usedRetries: 0, windowStart: now };
    }
  }
}
