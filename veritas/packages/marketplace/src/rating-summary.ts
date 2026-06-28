// Aggregate rating statistics for a marketplace listing from its published reviews.

import { z } from "zod";
import type { ListingId, RatingSummary } from "./types.js";
import type { ListingReview, StarRating } from "./review.js";
import { publishedReviews } from "./review.js";

/** Zod schema for RatingSummary. */
export const ratingSummarySchema = z.object({
  listingId: z.string().min(1),
  averageRating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  distribution: z.object({
    1: z.number().int().nonnegative(),
    2: z.number().int().nonnegative(),
    3: z.number().int().nonnegative(),
    4: z.number().int().nonnegative(),
    5: z.number().int().nonnegative(),
  }),
});

/** Build an empty rating summary for a listing with no reviews. */
export function emptyRatingSummary(listingId: ListingId): RatingSummary {
  return {
    listingId,
    averageRating: 0,
    reviewCount: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };
}

/**
 * Compute a RatingSummary from the published reviews of a listing.
 * Ignores non-published reviews.
 */
export function computeRatingSummary(
  listingId: ListingId,
  reviews: ReadonlyArray<ListingReview>,
): RatingSummary {
  const visible = publishedReviews(reviews);

  if (visible.length === 0) return emptyRatingSummary(listingId);

  const distribution: Record<StarRating, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;

  for (const review of visible) {
    distribution[review.rating] += 1;
    total += review.rating;
  }

  const averageRating = total / visible.length;

  return {
    listingId,
    averageRating: Math.round(averageRating * 100) / 100,
    reviewCount: visible.length,
    distribution,
  };
}

/** Incrementally update a RatingSummary when a new review is published. */
export function addReviewToSummary(
  summary: RatingSummary,
  rating: StarRating,
): RatingSummary {
  const newCount = summary.reviewCount + 1;
  const newTotal = summary.averageRating * summary.reviewCount + rating;
  const newAverage = Math.round((newTotal / newCount) * 100) / 100;
  const newDistribution = {
    ...summary.distribution,
    [rating]: summary.distribution[rating] + 1,
  } as RatingSummary["distribution"];

  return {
    listingId: summary.listingId,
    averageRating: newAverage,
    reviewCount: newCount,
    distribution: newDistribution,
  };
}

/** Incrementally update a RatingSummary when a review is removed. */
export function removeReviewFromSummary(
  summary: RatingSummary,
  rating: StarRating,
): RatingSummary {
  if (summary.reviewCount === 0) return summary;
  const newCount = summary.reviewCount - 1;
  const removedTotal = summary.averageRating * summary.reviewCount - rating;
  const newAverage = newCount === 0 ? 0 : Math.round((removedTotal / newCount) * 100) / 100;
  const newDistribution = {
    ...summary.distribution,
    [rating]: Math.max(0, summary.distribution[rating] - 1),
  } as RatingSummary["distribution"];

  return {
    listingId: summary.listingId,
    averageRating: newAverage,
    reviewCount: newCount,
    distribution: newDistribution,
  };
}

/** Return the star value(s) with the highest count in the distribution. */
export function modalRating(summary: RatingSummary): ReadonlyArray<StarRating> {
  const max = Math.max(...Object.values(summary.distribution));
  if (max === 0) return [];
  return ([1, 2, 3, 4, 5] as StarRating[]).filter(
    (star) => summary.distribution[star] === max,
  );
}
