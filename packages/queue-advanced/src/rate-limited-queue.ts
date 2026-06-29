// Rate-limited queue: caps message consumption to a fixed rate per second using token bucket.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { QueueMessage, RateLimitedQueuePort } from "./types.js";
import { QueueFullError } from "./errors.js";

export interface RateLimitedQueueOptions {
  readonly ratePerSecond: number;
  readonly burstCapacity?: number;
  readonly capacity?: number;
}

export class InMemoryRateLimitedQueue<T> implements RateLimitedQueuePort<T> {
  private readonly queue: QueueMessage<T>[] = [];
  private readonly ratePerSecond: number;
  private readonly burstCapacity: number;
  private readonly capacity: number;
  private tokens: number;
  private lastRefillAt: number;

  constructor(opts: RateLimitedQueueOptions) {
    this.ratePerSecond = opts.ratePerSecond;
    this.burstCapacity = opts.burstCapacity ?? opts.ratePerSecond;
    this.capacity = opts.capacity ?? 10_000;
    this.tokens = this.burstCapacity;
    this.lastRefillAt = Date.now();
  }

  enqueue(message: QueueMessage<T>): Result<void> {
    if (this.queue.length >= this.capacity) {
      return err(new QueueFullError(this.capacity));
    }
    this.queue.push(message);
    return ok(undefined);
  }

  consume(now: number = Date.now()): Result<QueueMessage<T>[]> {
    this.refill(now);
    const available = Math.min(Math.floor(this.tokens), this.queue.length);
    if (available === 0) return ok([]);
    const batch = this.queue.splice(0, available);
    this.tokens -= available;
    return ok(batch);
  }

  size(): number {
    return this.queue.length;
  }

  private refill(now: number): void {
    const elapsed = (now - this.lastRefillAt) / 1000;
    const newTokens = elapsed * this.ratePerSecond;
    this.tokens = Math.min(this.burstCapacity, this.tokens + newTokens);
    this.lastRefillAt = now;
  }
}
