// Bulkhead isolation: limits max concurrent executions and optional queue depth.
import { Result, ok, err } from "@veritas/core";
import { BulkheadFullError } from "./errors.js";
import type { BulkheadOptions } from "./types.js";

interface BulkheadState {
  readonly active: number;
  readonly queued: number;
}

/** Semaphore-style concurrency limiter; rejects excess calls rather than hanging. */
export class Bulkhead {
  private state: BulkheadState = { active: 0, queued: 0 };
  private readonly opts: Required<BulkheadOptions>;
  private readonly queue: Array<() => void> = [];

  constructor(opts: BulkheadOptions) {
    this.opts = {
      maxConcurrency: opts.maxConcurrency,
      maxQueue: opts.maxQueue ?? 0,
      name: opts.name ?? "bulkhead",
    };
  }

  get active(): number {
    return this.state.active;
  }

  get queued(): number {
    return this.state.queued;
  }

  async execute<T>(fn: () => Promise<T>): Promise<Result<T, BulkheadFullError | unknown>> {
    if (this.state.active < this.opts.maxConcurrency) {
      return this.run(fn);
    }

    if (this.state.queued >= this.opts.maxQueue) {
      return err(new BulkheadFullError(this.opts.name));
    }

    return new Promise<Result<T, BulkheadFullError | unknown>>((resolve) => {
      this.state = { ...this.state, queued: this.state.queued + 1 };
      this.queue.push(() => {
        this.state = { ...this.state, queued: this.state.queued - 1 };
        resolve(this.run(fn));
      });
    });
  }

  private async run<T>(fn: () => Promise<T>): Promise<Result<T, unknown>> {
    this.state = { ...this.state, active: this.state.active + 1 };
    try {
      const value = await fn();
      return ok(value);
    } catch (e) {
      return err(e);
    } finally {
      this.state = { ...this.state, active: this.state.active - 1 };
      const next = this.queue.shift();
      if (next !== undefined) next();
    }
  }
}
