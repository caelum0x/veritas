// Token-bucket throttle that limits campaign sends per minute per campaign.

import { ok, err, type Result } from "@veritas/core";
import { CampaignValidationError } from "./errors.js";

export interface ThrottleConfig {
  /** Maximum sends allowed per 60-second window. */
  readonly maxPerMinute: number;
}

interface BucketState {
  tokens: number;
  lastRefillAt: number;
}

/** Token-bucket rate limiter for campaign message dispatch. */
export class CampaignThrottle {
  private readonly buckets = new Map<string, BucketState>();
  private readonly config: ThrottleConfig;

  constructor(config: ThrottleConfig) {
    if (config.maxPerMinute <= 0) {
      throw new CampaignValidationError("maxPerMinute must be positive");
    }
    this.config = config;
  }

  /**
   * Attempts to consume `count` tokens for the given campaignId.
   * Returns ok(true) if allowed, err if rate limit exceeded.
   */
  tryConsume(
    campaignId: string,
    count = 1,
  ): Result<true, CampaignValidationError> {
    const now = Date.now();
    const bucket = this.getOrCreateBucket(campaignId, now);
    this.refill(bucket, now);

    if (bucket.tokens < count) {
      return err(
        new CampaignValidationError(
          `Campaign ${campaignId} is throttled: only ${bucket.tokens} tokens available, ${count} requested`,
        ),
      );
    }

    bucket.tokens -= count;
    return ok(true);
  }

  /** Returns remaining tokens for a campaign without consuming any. */
  available(campaignId: string): number {
    const now = Date.now();
    const bucket = this.getOrCreateBucket(campaignId, now);
    this.refill(bucket, now);
    return bucket.tokens;
  }

  /** Resets the bucket for a campaign (e.g., after pause/resume). */
  reset(campaignId: string): void {
    this.buckets.delete(campaignId);
  }

  private getOrCreateBucket(campaignId: string, now: number): BucketState {
    let bucket = this.buckets.get(campaignId);
    if (bucket === undefined) {
      bucket = { tokens: this.config.maxPerMinute, lastRefillAt: now };
      this.buckets.set(campaignId, bucket);
    }
    return bucket;
  }

  private refill(bucket: BucketState, now: number): void {
    const elapsedMs = now - bucket.lastRefillAt;
    if (elapsedMs < 60_000) return;

    const minutes = Math.floor(elapsedMs / 60_000);
    bucket.tokens = Math.min(
      this.config.maxPerMinute,
      bucket.tokens + minutes * this.config.maxPerMinute,
    );
    bucket.lastRefillAt = bucket.lastRefillAt + minutes * 60_000;
  }
}

/**
 * Partitions a list of recipients into batches that respect the throttle limit.
 * Returns arrays of recipient IDs to send in each batch window.
 */
export function batchByThrottle(
  recipientIds: ReadonlyArray<string>,
  maxPerMinute: number,
): ReadonlyArray<ReadonlyArray<string>> {
  if (maxPerMinute <= 0 || recipientIds.length === 0) return [];
  const batches: string[][] = [];
  for (let i = 0; i < recipientIds.length; i += maxPerMinute) {
    batches.push(recipientIds.slice(i, i + maxPerMinute) as string[]);
  }
  return batches;
}
