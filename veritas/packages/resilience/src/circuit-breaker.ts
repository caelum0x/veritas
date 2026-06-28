// Circuit breaker: open/half-open/closed state machine protecting downstream calls.
import { Result, ok, err } from "@veritas/core";
import {
  BreakerStateData,
  initialBreakerState,
  recordFailure,
  recordSuccess,
  maybeTransitionToHalfOpen,
} from "./state.js";
import { CircuitOpenError } from "./errors.js";
import type { CircuitBreakerOptions } from "./types.js";

export class CircuitBreaker {
  private data: BreakerStateData;
  private readonly opts: Required<CircuitBreakerOptions>;

  constructor(opts: CircuitBreakerOptions) {
    this.opts = {
      failureThreshold: opts.failureThreshold ?? 5,
      successThreshold: opts.successThreshold ?? 2,
      halfOpenMaxCalls: opts.halfOpenMaxCalls ?? 1,
      resetTimeoutMs: opts.resetTimeoutMs ?? 30_000,
      name: opts.name ?? "default",
    };
    this.data = initialBreakerState;
  }

  get name(): string {
    return this.opts.name;
  }

  getState(): BreakerStateData["state"] {
    return this.data.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<Result<T, CircuitOpenError | unknown>> {
    const now = Date.now();
    this.data = maybeTransitionToHalfOpen(this.data, this.opts.resetTimeoutMs, now);

    if (this.data.state === "OPEN") {
      return err(new CircuitOpenError(this.opts.name));
    }

    try {
      const value = await fn();
      this.data = recordSuccess(this.data, this.opts.successThreshold);
      return ok(value);
    } catch (e) {
      this.data = recordFailure(this.data, this.opts.failureThreshold, Date.now());
      return err(e);
    }
  }

  forceOpen(): void {
    this.data = { ...this.data, state: "OPEN", openedAt: Date.now() };
  }

  forceClosed(): void {
    this.data = initialBreakerState;
  }
}
