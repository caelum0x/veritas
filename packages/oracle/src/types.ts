// Shared types for the oracle module.
import { Brand, brand } from "@veritas/core";

/** Branded feed identifier (e.g. "ETH/USD"). */
export type FeedId = Brand<string, "FeedId">;

export const feedId = (raw: string): FeedId => brand<string, "FeedId">(raw);

/** A single answered data point returned by an oracle round. */
export interface FeedAnswer {
  readonly feedId: FeedId;
  readonly roundId: bigint;
  readonly answer: bigint;        // raw integer value (shifted by decimals)
  readonly decimals: number;      // how many decimal places the answer uses
  readonly updatedAt: number;     // unix epoch seconds
  readonly startedAt: number;     // unix epoch seconds
}

/** Aggregation strategy for combining multiple feed answers. */
export type AggregationStrategy = "median" | "mean" | "min" | "max";

/** Feed metadata describing what a feed measures. */
export interface FeedMeta {
  readonly feedId: FeedId;
  readonly description: string;
  readonly decimals: number;
  readonly heartbeatSeconds: number;
  readonly deviationThresholdBps: number; // basis points
}
