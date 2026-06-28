// Circuit breaker: prevents cascading failures by short-circuiting calls to unhealthy upstreams.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  readonly failureThreshold: number;
  readonly successThreshold: number;
  readonly openDurationMs: number;
  readonly volumeThreshold: number;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  successThreshold: 2,
  openDurationMs: 30_000,
  volumeThreshold: 10,
};

export interface CircuitBreakerError {
  readonly code: "CIRCUIT_OPEN";
  readonly message: string;
  readonly retryAfterMs: number;
}

interface CircuitData {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalCount: number;
  openedAt: number | null;
}

export class CircuitBreaker {
  private readonly options: CircuitBreakerOptions;
  private readonly circuits = new Map<string, CircuitData>();

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = Object.freeze({ ...DEFAULT_OPTIONS, ...options });
  }

  private getOrCreate(key: string): CircuitData {
    let data = this.circuits.get(key);
    if (!data) {
      data = {
        state: "CLOSED",
        failureCount: 0,
        successCount: 0,
        totalCount: 0,
        openedAt: null,
      };
      this.circuits.set(key, data);
    }
    return data;
  }

  /** Check whether a call is allowed through for the given key. */
  allow(key: string): Result<void, CircuitBreakerError> {
    const data = this.getOrCreate(key);
    const now = Date.now();

    if (data.state === "OPEN") {
      const elapsed = now - (data.openedAt ?? now);
      if (elapsed >= this.options.openDurationMs) {
        data.state = "HALF_OPEN";
        data.successCount = 0;
      } else {
        return err({
          code: "CIRCUIT_OPEN",
          message: `Circuit breaker is OPEN for upstream "${key}"`,
          retryAfterMs: this.options.openDurationMs - elapsed,
        });
      }
    }

    return ok(undefined);
  }

  /** Record a successful call; may transition HALF_OPEN -> CLOSED. */
  recordSuccess(key: string): void {
    const data = this.getOrCreate(key);
    data.totalCount += 1;
    data.successCount += 1;

    if (data.state === "HALF_OPEN") {
      if (data.successCount >= this.options.successThreshold) {
        data.state = "CLOSED";
        data.failureCount = 0;
        data.successCount = 0;
        data.totalCount = 0;
        data.openedAt = null;
      }
    } else if (data.state === "CLOSED") {
      data.failureCount = Math.max(0, data.failureCount - 1);
    }
  }

  /** Record a failed call; may transition CLOSED -> OPEN. */
  recordFailure(key: string): void {
    const data = this.getOrCreate(key);
    data.totalCount += 1;
    data.failureCount += 1;

    if (data.state === "HALF_OPEN") {
      data.state = "OPEN";
      data.openedAt = Date.now();
      data.successCount = 0;
      return;
    }

    if (
      data.state === "CLOSED" &&
      data.totalCount >= this.options.volumeThreshold &&
      data.failureCount >= this.options.failureThreshold
    ) {
      data.state = "OPEN";
      data.openedAt = Date.now();
    }
  }

  /** Return current state for a key (CLOSED if never seen). */
  getState(key: string): CircuitState {
    return this.circuits.get(key)?.state ?? "CLOSED";
  }

  /** Reset a circuit to CLOSED (useful for manual recovery). */
  reset(key: string): void {
    this.circuits.delete(key);
  }
}
