// Review entity: a structured peer review of an agent's verification work.

import { newId, type Id, type UserId, type IsoTimestamp, epochToIso } from "@veritas/core";
import { z } from "zod";
import { ratingSchema, type Rating, type RatingValue, createRating } from "./rating.js";

/** Branded id for reviews. */
export type ReviewId = Id<"review">;

export const newReviewId = (): ReviewId => newId("review");

/** Possible lifecycle states of a review. */
export type ReviewStatus = "pending" | "published" | "removed";

/** Immutable review entity. */
export interface Review {
  readonly id: ReviewId;
  readonly agentId: string;
  readonly reviewerId: UserId;
  readonly rating: Rating;
  readonly title: string;
  readonly body: string;
  readonly status: ReviewStatus;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/** Input for creating a new Review (id + timestamps auto-generated). */
export interface CreateReviewInput {
  readonly agentId: string;
  readonly reviewerId: UserId;
  readonly ratingValue: RatingValue;
  readonly ratingComment?: string;
  readonly title: string;
  readonly body: string;
}

/** Zod schema for CreateReviewInput. */
export const createReviewInputSchema = z.object({
  agentId: z.string().min(1),
  reviewerId: z.string().min(1),
  ratingValue: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  ratingComment: z.string().max(1000).optional(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
});

/** Factory: construct a new Review with auto-generated id and timestamps. */
export function createReview(input: CreateReviewInput): Review {
  const now = epochToIso(Date.now());
  return {
    id: newReviewId(),
    agentId: input.agentId,
    reviewerId: input.reviewerId,
    rating: createRating(input.ratingValue, input.ratingComment),
    title: input.title.trim(),
    body: input.body.trim(),
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
}

/** Return a new Review with status changed to "published". */
export function publishReview(review: Review): Review {
  return { ...review, status: "published", updatedAt: epochToIso(Date.now()) };
}

/** Return a new Review with status changed to "removed". */
export function removeReview(review: Review): Review {
  return { ...review, status: "removed", updatedAt: epochToIso(Date.now()) };
}

/** Return true when the review is visible to end users. */
export function isVisible(review: Review): boolean {
  return review.status === "published";
}
