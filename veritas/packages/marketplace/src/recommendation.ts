// Recommend marketplace listings to a buyer based on past orders and category affinity.

import { z } from "zod";
import type { Score } from "@veritas/core";
import { clampScore } from "@veritas/core";
import type { Listing } from "./types.js";

/** Buyer signals used to generate recommendations. */
export interface BuyerSignals {
  /** Listing ids the buyer has previously ordered. */
  readonly pastListingIds: ReadonlyArray<string>;
  /** Category ids the buyer has engaged with, in descending preference order. */
  readonly preferredCategoryIds: ReadonlyArray<string>;
  /** Tag ids the buyer has engaged with. */
  readonly preferredTagIds: ReadonlyArray<string>;
}

/** Zod schema for BuyerSignals. */
export const buyerSignalsSchema = z.object({
  pastListingIds: z.array(z.string()),
  preferredCategoryIds: z.array(z.string()),
  preferredTagIds: z.array(z.string()),
});

/** A recommended listing with its affinity score and reason label. */
export interface Recommendation {
  readonly listing: Listing;
  readonly affinity: Score;
  readonly reason: string;
}

/** Compute category affinity score for a listing given ordered preferences. */
function categoryAffinity(
  listing: Listing,
  preferredCategoryIds: ReadonlyArray<string>,
): number {
  const idx = preferredCategoryIds.indexOf(listing.categoryId);
  if (idx === -1) return 0;
  return 1 / (idx + 1); // decay by rank position
}

/** Compute tag affinity score based on overlap with preferred tags. */
function tagAffinity(
  listing: Listing,
  preferredTagIds: ReadonlyArray<string>,
): number {
  if (preferredTagIds.length === 0) return 0;
  const preferred = new Set(preferredTagIds);
  const hits = listing.tagIds.filter((t) => preferred.has(t)).length;
  return hits / preferredTagIds.length;
}

/** Derive a human-readable reason for a recommendation. */
function deriveReason(
  listing: Listing,
  signals: BuyerSignals,
  catAffinity: number,
  tagAffinityVal: number,
): string {
  if (catAffinity > tagAffinityVal) {
    return `Matches your preferred category`;
  }
  if (tagAffinityVal > 0) {
    return `Matches your interests`;
  }
  if (listing.averageRating >= 4.5) {
    return `Highly rated service`;
  }
  return `Popular in this category`;
}

/**
 * Generate ranked recommendations for a buyer from available published listings.
 * Excludes listings the buyer has already ordered.
 */
export function recommend(
  signals: BuyerSignals,
  listings: ReadonlyArray<Listing>,
  limit = 20,
): ReadonlyArray<Recommendation> {
  const past = new Set(signals.pastListingIds);

  const candidates = listings.filter(
    (l) => l.status === "published" && !past.has(l.id),
  );

  const scored = candidates.map((listing) => {
    const catScore = categoryAffinity(listing, signals.preferredCategoryIds);
    const tagScore = tagAffinity(listing, signals.preferredTagIds);
    const ratingBoost = listing.averageRating / 5;
    // Weighted blend: category 40%, tags 35%, rating 25%
    const affinity = clampScore(catScore * 0.4 + tagScore * 0.35 + ratingBoost * 0.25);
    const reason = deriveReason(listing, signals, catScore, tagScore);
    return { listing, affinity, reason };
  });

  return scored
    .sort((a, b) => b.affinity - a.affinity)
    .slice(0, Math.max(0, limit));
}

/** Return only recommendations above a minimum affinity threshold. */
export function filterRecommendations(
  recs: ReadonlyArray<Recommendation>,
  minAffinity: number,
): ReadonlyArray<Recommendation> {
  return recs.filter((r) => r.affinity >= minAffinity);
}
