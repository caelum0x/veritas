// Rank marketplace listings by a composite score blending relevance, rating, and recency.

import type { Score } from "@veritas/core";
import { clampScore } from "@veritas/core";
import type { Listing } from "./types.js";

/** Weights used to compute the composite ranking score. */
export interface RankingWeights {
  readonly relevance: number;
  readonly rating: number;
  readonly recency: number;
  readonly popularity: number;
}

/** Default weights summing to 1.0. */
export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  relevance: 0.35,
  rating: 0.30,
  recency: 0.20,
  popularity: 0.15,
};

/** A listing with its computed composite rank score and ordinal position. */
export interface RankedListing {
  readonly listing: Listing;
  readonly compositeScore: Score;
  readonly rank: number;
}

/** Normalise a recency timestamp relative to the newest listing in the set. */
function recencyScore(listing: Listing, newestMs: number, oldestMs: number): number {
  const span = newestMs - oldestMs;
  if (span === 0) return 1;
  const ageMs = newestMs - new Date(listing.createdAt).getTime();
  return Math.max(0, 1 - ageMs / span);
}

/** Normalise popularity (order count) relative to max in the set. */
function popularityScore(listing: Listing, maxOrders: number): number {
  if (maxOrders === 0) return 0;
  return Math.min(1, listing.orderCount / maxOrders);
}

/** Normalise average rating from [0, 5] to [0, 1]. */
function ratingScore(listing: Listing): number {
  return Math.min(1, Math.max(0, listing.averageRating / 5));
}

/**
 * Rank listings by composite score blending relevance, rating, recency, and popularity.
 * `relevanceScores` maps listing id to pre-computed relevance in [0, 1].
 */
export function rankListings(
  listings: ReadonlyArray<Listing>,
  relevanceScores: ReadonlyMap<string, number>,
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS,
): ReadonlyArray<RankedListing> {
  if (listings.length === 0) return [];

  const timestamps = listings.map((l) => new Date(l.createdAt).getTime());
  const newestMs = Math.max(...timestamps);
  const oldestMs = Math.min(...timestamps);
  const maxOrders = Math.max(...listings.map((l) => l.orderCount), 0);

  const scored = listings.map((listing) => {
    const relevance = relevanceScores.get(listing.id) ?? 0;
    const composite = clampScore(
      weights.relevance * relevance +
        weights.rating * ratingScore(listing) +
        weights.recency * recencyScore(listing, newestMs, oldestMs) +
        weights.popularity * popularityScore(listing, maxOrders),
    );
    return { listing, compositeScore: composite };
  });

  const sorted = scored.sort((a, b) => b.compositeScore - a.compositeScore);

  return sorted.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/** Return listings whose composite score is at or above the given threshold. */
export function filterByMinScore(
  ranked: ReadonlyArray<RankedListing>,
  minScore: number,
): ReadonlyArray<RankedListing> {
  return ranked.filter((r) => r.compositeScore >= minScore);
}

/** Return the top-N ranked listings. */
export function topRanked(
  ranked: ReadonlyArray<RankedListing>,
  n: number,
): ReadonlyArray<RankedListing> {
  return ranked.slice(0, Math.max(0, n));
}
