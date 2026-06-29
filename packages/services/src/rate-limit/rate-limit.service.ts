// Rate-limit application service: enforces per-subject sliding-window request quotas.
import {
  ok,
  err,
  type Result,
  type AppError,
  type Clock,
  systemClock,
  type Logger,
  noopLogger,
} from "@veritas/core";
import { QuotaExceededError } from "../errors.js";
import type {
  CheckRateLimitInput,
  ResetRateLimitInput,
  GetRateLimitStatusInput,
  RateLimitCheckResult,
  RateLimitStatusOutput,
  RateLimitWindow,
} from "./rate-limit.dto.js";
import type { ServiceContext } from "../service-context.js";

/** In-memory counter bucket for a single subject+key combination. */
interface CounterBucket {
  readonly subjectId: string;
  readonly limitKey: string;
  consumed: number;
  readonly limit: number;
  readonly window: RateLimitWindow;
  windowStartMs: number;
}

/** Pluggable storage backend for rate-limit counters. */
export interface RateLimitStore {
  get(subjectId: string, limitKey: string): Promise<CounterBucket | undefined>;
  set(bucket: CounterBucket): Promise<void>;
  delete(subjectId: string, limitKey: string): Promise<void>;
}

/** Returns the window duration in milliseconds for the given granularity. */
function windowMs(window: RateLimitWindow): number {
  switch (window) {
    case "SECOND": return 1_000;
    case "MINUTE": return 60_000;
    case "HOUR":   return 3_600_000;
    case "DAY":    return 86_400_000;
  }
}

/** Compute the ISO timestamp at which the current window resets. */
function resetsAt(windowStartMs: number, window: RateLimitWindow): string {
  return new Date(windowStartMs + windowMs(window)).toISOString();
}

/** Dependencies injected into RateLimitService. */
export interface RateLimitServiceDeps {
  readonly store: RateLimitStore;
  readonly clock?: Clock;
  readonly logger?: Logger;
}

/** Application service for enforcing per-subject rate limits. */
export class RateLimitService {
  private readonly store: RateLimitStore;
  private readonly clock: Clock;
  private readonly logger: Logger;

  constructor(deps: RateLimitServiceDeps) {
    this.store = deps.store;
    this.clock = deps.clock ?? systemClock;
    this.logger = deps.logger ?? noopLogger;
  }

  /**
   * Check whether a subject may proceed with an operation.
   * Increments the counter if allowed; returns RateLimitedError if exceeded.
   */
  async check(
    ctx: ServiceContext,
    input: CheckRateLimitInput,
  ): Promise<Result<RateLimitCheckResult, AppError>> {
    const now = this.clock.now();
    const winMs = windowMs(input.window);
    const existing = await this.store.get(input.subjectId, input.limitKey);

    let bucket: CounterBucket;

    if (!existing || now - existing.windowStartMs >= winMs) {
      // Start a fresh window.
      bucket = {
        subjectId: input.subjectId,
        limitKey: input.limitKey,
        consumed: 0,
        limit: input.maxRequests,
        window: input.window,
        windowStartMs: now,
      };
    } else {
      bucket = { ...existing };
    }

    const wouldExceed = bucket.consumed + input.cost > input.maxRequests;

    if (wouldExceed) {
      const status = this.toStatusOutput(bucket, input.maxRequests);
      this.logger.warn("rate-limit: exceeded", {
        limitKey: input.limitKey,
        subjectId: input.subjectId,
        consumed: bucket.consumed,
        limit: input.maxRequests,
        traceId: ctx.traceId,
      });
      return ok({ allowed: false, status });
    }

    const updated: CounterBucket = { ...bucket, consumed: bucket.consumed + input.cost };
    await this.store.set(updated);

    const status = this.toStatusOutput(updated, input.maxRequests);
    return ok({ allowed: true, status });
  }

  /**
   * Enforce a rate limit and return an error Result if the limit is exceeded.
   * Convenience wrapper around check() for use in guard positions.
   */
  async enforce(
    ctx: ServiceContext,
    input: CheckRateLimitInput,
  ): Promise<Result<RateLimitStatusOutput, AppError>> {
    const result = await this.check(ctx, input);
    if (!result.ok) return err(result.error);
    if (!result.value.allowed) {
      return err(
        new QuotaExceededError(
          input.limitKey,
          input.maxRequests,
          input.window.toLowerCase(),
        ) as AppError,
      );
    }
    return ok(result.value.status);
  }

  /** Retrieve the current rate-limit status for a subject without modifying the counter. */
  async getStatus(
    ctx: ServiceContext,
    input: GetRateLimitStatusInput,
  ): Promise<Result<RateLimitStatusOutput, AppError>> {
    const now = this.clock.now();
    const winMs = windowMs(input.window);
    const existing = await this.store.get(input.subjectId, input.limitKey);

    if (!existing || now - existing.windowStartMs >= winMs) {
      // No active window — return zeroed status.
      const status: RateLimitStatusOutput = {
        limitKey: input.limitKey,
        subjectId: input.subjectId,
        consumed: 0,
        remaining: existing?.limit ?? 0,
        limit: existing?.limit ?? 0,
        window: input.window,
        resetsAt: new Date(now + winMs).toISOString(),
        isExceeded: false,
      };
      return ok(status);
    }

    this.logger.debug("rate-limit: status fetched", {
      limitKey: input.limitKey,
      subjectId: input.subjectId,
      traceId: ctx.traceId,
    });

    return ok(this.toStatusOutput(existing, existing.limit));
  }

  /** Reset the counter for a subject+limitKey pair, clearing the current window. */
  async reset(
    ctx: ServiceContext,
    input: ResetRateLimitInput,
  ): Promise<Result<void, AppError>> {
    await this.store.delete(input.subjectId, input.limitKey);
    this.logger.info("rate-limit: reset", {
      limitKey: input.limitKey,
      subjectId: input.subjectId,
      traceId: ctx.traceId,
    });
    return ok(undefined);
  }

  private toStatusOutput(bucket: CounterBucket, limit: number): RateLimitStatusOutput {
    const remaining = Math.max(0, limit - bucket.consumed);
    return {
      limitKey: bucket.limitKey,
      subjectId: bucket.subjectId,
      consumed: bucket.consumed,
      remaining,
      limit,
      window: bucket.window,
      resetsAt: resetsAt(bucket.windowStartMs, bucket.window),
      isExceeded: bucket.consumed >= limit,
    };
  }
}

/** Simple in-memory RateLimitStore suitable for single-process deployments and tests. */
export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly map = new Map<string, CounterBucket>();

  private key(subjectId: string, limitKey: string): string {
    return `${subjectId}::${limitKey}`;
  }

  async get(subjectId: string, limitKey: string): Promise<CounterBucket | undefined> {
    return this.map.get(this.key(subjectId, limitKey));
  }

  async set(bucket: CounterBucket): Promise<void> {
    this.map.set(this.key(bucket.subjectId, bucket.limitKey), { ...bucket });
  }

  async delete(subjectId: string, limitKey: string): Promise<void> {
    this.map.delete(this.key(subjectId, limitKey));
  }
}
