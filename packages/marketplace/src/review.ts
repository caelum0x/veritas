// Marketplace listing review entity: buyer ratings and comments on a listing.

import { z } from "zod";
import { newId, type Id, type IsoTimestamp, epochToIso, ValidationError } from "@veritas/core";
import type { ListingId } from "./types.js";

/** Branded id for listing reviews. */
export type ListingReviewId = Id<"lrev">;

export const newListingReviewId = (): ListingReviewId => newId("lrev");

/** Lifecycle state of a listing review. */
export type ListingReviewStatus = "pending" | "published" | "removed";

/** Star rating value bounded to [1, 5]. */
export type StarRating = 1 | 2 | 3 | 4 | 5;

/** Immutable listing review entity. */
export interface ListingReview {
  readonly id: ListingReviewId;
  readonly listingId: ListingId;
  readonly reviewerId: string;
  readonly rating: StarRating;
  readonly title: string;
  readonly body: string;
  readonly status: ListingReviewStatus;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/** Input required to create a ListingReview. */
export interface CreateListingReviewInput {
  readonly listingId: ListingId;
  readonly reviewerId: string;
  readonly rating: StarRating;
  readonly title: string;
  readonly body: string;
}

/** Zod schema for CreateListingReviewInput. */
export const createListingReviewSchema = z.object({
  listingId: z.string().min(1),
  reviewerId: z.string().min(1),
  rating: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
});

/** Factory: construct a new ListingReview with auto-generated id and timestamps. */
export function createListingReview(input: CreateListingReviewInput): ListingReview {
  if (input.rating < 1 || input.rating > 5 || !Number.isInteger(input.rating)) {
    throw new ValidationError({ message: `Rating must be an integer in [1, 5]` });
  }
  const now = epochToIso(Date.now());
  return {
    id: newListingReviewId(),
    listingId: input.listingId,
    reviewerId: input.reviewerId,
    rating: input.rating,
    title: input.title.trim(),
    body: input.body.trim(),
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
}

/** Return a new ListingReview with status set to "published". */
export function publishListingReview(review: ListingReview): ListingReview {
  return { ...review, status: "published", updatedAt: epochToIso(Date.now()) };
}

/** Return a new ListingReview with status set to "removed". */
export function removeListingReview(review: ListingReview): ListingReview {
  return { ...review, status: "removed", updatedAt: epochToIso(Date.now()) };
}

/** Return true when the review is visible to end users. */
export function isReviewVisible(review: ListingReview): boolean {
  return review.status === "published";
}

/** Filter an array of reviews to only published ones. */
export function publishedReviews(
  reviews: ReadonlyArray<ListingReview>,
): ReadonlyArray<ListingReview> {
  return reviews.filter(isReviewVisible);
}
