// Staleness checks: determine whether oracle data has exceeded its freshness TTL

import { type Result, ok, err } from "@veritas/core";
import type { FeedRound } from "./round.js";
import { StaleDataError } from "./errors.js";

/** Configuration for staleness thresholds per feed or globally */
export interface StalenessConfig {
  /** Default max age in seconds before data is considered stale */
  readonly defaultMaxAgeSeconds: number;
  /** Per-feed overrides keyed by feedId */
  readonly perFeedMaxAgeSeconds?: Readonly<Record<string, number>>;
}

/** Default staleness config: 3600s (1 hour) globally */
export const DEFAULT_STALENESS_CONFIG: StalenessConfig = {
  defaultMaxAgeSeconds: 3600,
};

/** Resolve the effective max age for a specific feed */
export function resolveMaxAge(feedId: string, config: StalenessConfig): number {
  return config.perFeedMaxAgeSeconds?.[feedId] ?? config.defaultMaxAgeSeconds;
}

/** Check whether a round is fresh; return ok(round) or err(StaleDataError) */
export function checkStaleness(
  round: FeedRound,
  nowSeconds: number,
  config: StalenessConfig,
): Result<FeedRound, StaleDataError> {
  const maxAge = resolveMaxAge(round.feedId, config);
  const age = Math.max(0, nowSeconds - round.updatedAt);
  if (age > maxAge) {
    return err(new StaleDataError(round.feedId, age, maxAge));
  }
  return ok(round);
}

/** Return true if round data is within its freshness window */
export function isFresh(
  round: FeedRound,
  nowSeconds: number,
  config: StalenessConfig,
): boolean {
  const maxAge = resolveMaxAge(round.feedId, config);
  return Math.max(0, nowSeconds - round.updatedAt) <= maxAge;
}

/** Compute remaining freshness seconds (negative means already stale) */
export function freshnessRemainingSeconds(
  round: FeedRound,
  nowSeconds: number,
  config: StalenessConfig,
): number {
  const maxAge = resolveMaxAge(round.feedId, config);
  const age = Math.max(0, nowSeconds - round.updatedAt);
  return maxAge - age;
}
