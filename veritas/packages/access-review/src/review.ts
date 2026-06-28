// Access review campaign: create and transition periodic access review campaigns.

import { z } from "zod";
import {
  type Result, ok, err, newId, type Id, type IsoTimestamp, epochToIso, ValidationError,
} from "@veritas/core";
import { InvalidReviewStateError } from "./errors.js";

export type ReviewId = Id<"review">;
export const newReviewId = (): ReviewId => newId("review");

export type ReviewScope = "org" | "team" | "role" | "resource";
export type ReviewStatus = "pending" | "in_progress" | "completed" | "cancelled";

export const ReviewStatusSchema = z.enum(["pending", "in_progress", "completed", "cancelled"]);

export const CreateReviewSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  orgId: z.string().min(1),
  scope: z.enum(["org", "team", "role", "resource"]),
  scopeId: z.string().min(1),
  reviewerIds: z.array(z.string().min(1)).min(1),
  dueAt: z.string().datetime(),
  createdBy: z.string().min(1),
});

export type CreateReview = z.infer<typeof CreateReviewSchema>;

export interface AccessReview {
  readonly id: ReviewId;
  readonly name: string;
  readonly description: string | undefined;
  readonly orgId: string;
  readonly scope: ReviewScope;
  readonly scopeId: string;
  readonly reviewerIds: readonly string[];
  readonly status: ReviewStatus;
  readonly dueAt: IsoTimestamp;
  readonly createdBy: string;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
  readonly completedAt: IsoTimestamp | undefined;
}

export function createReview(
  input: unknown,
): Result<AccessReview, ValidationError | InvalidReviewStateError> {
  const parsed = CreateReviewSchema.safeParse(input);
  if (!parsed.success) {
    return err(new ValidationError({ message: "Invalid review input", cause: parsed.error }));
  }

  const now = epochToIso(Date.now());
  const review: AccessReview = {
    id: newReviewId(),
    name: parsed.data.name,
    description: parsed.data.description,
    orgId: parsed.data.orgId,
    scope: parsed.data.scope,
    scopeId: parsed.data.scopeId,
    reviewerIds: Object.freeze([...parsed.data.reviewerIds]),
    status: "pending",
    dueAt: parsed.data.dueAt as IsoTimestamp,
    createdBy: parsed.data.createdBy,
    createdAt: now,
    updatedAt: now,
    completedAt: undefined,
  };

  return ok(review);
}

const ALLOWED_TRANSITIONS: Readonly<Record<ReviewStatus, readonly ReviewStatus[]>> = {
  pending: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function transitionReviewStatus(
  review: AccessReview,
  next: ReviewStatus,
): Result<AccessReview, InvalidReviewStateError> {
  if (!ALLOWED_TRANSITIONS[review.status].includes(next)) {
    return err(
      new InvalidReviewStateError(`Cannot transition from ${review.status} to ${next}`),
    );
  }

  const now = epochToIso(Date.now());
  return ok({
    ...review,
    status: next,
    updatedAt: now,
    completedAt: next === "completed" ? now : review.completedAt,
  });
}
