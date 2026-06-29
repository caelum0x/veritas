// Reviewer assignment: assign and manage reviewers for access review campaigns.

import { z } from "zod";
import {
  type Result, ok, err, newId, type Id, type IsoTimestamp, epochToIso, ValidationError,
} from "@veritas/core";
import type { ReviewId } from "./review.js";
import { ReviewerNotFoundError } from "./errors.js";

export type ReviewerAssignmentId = Id<"rassign">;
export const newReviewerAssignmentId = (): ReviewerAssignmentId => newId("rassign");

export type ReviewerStatus = "assigned" | "accepted" | "declined" | "completed";

export const AssignReviewerSchema = z.object({
  reviewId: z.string().min(1),
  reviewerId: z.string().min(1),
  reviewerEmail: z.string().email(),
  displayName: z.string().min(1).max(200),
  assignedBy: z.string().min(1),
  notifyAt: z.string().datetime().optional(),
});

export type AssignReviewer = z.infer<typeof AssignReviewerSchema>;

export interface ReviewerAssignment {
  readonly id: ReviewerAssignmentId;
  readonly reviewId: ReviewId;
  readonly reviewerId: string;
  readonly reviewerEmail: string;
  readonly displayName: string;
  readonly status: ReviewerStatus;
  readonly assignedBy: string;
  readonly notifyAt: IsoTimestamp | undefined;
  readonly respondedAt: IsoTimestamp | undefined;
  readonly completedAt: IsoTimestamp | undefined;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export function assignReviewer(
  input: unknown,
): Result<ReviewerAssignment, ValidationError> {
  const parsed = AssignReviewerSchema.safeParse(input);
  if (!parsed.success) {
    return err(new ValidationError({ message: "Invalid reviewer assignment input", cause: parsed.error }));
  }

  const now = epochToIso(Date.now());
  const assignment: ReviewerAssignment = {
    id: newReviewerAssignmentId(),
    reviewId: parsed.data.reviewId as ReviewId,
    reviewerId: parsed.data.reviewerId,
    reviewerEmail: parsed.data.reviewerEmail,
    displayName: parsed.data.displayName,
    status: "assigned",
    assignedBy: parsed.data.assignedBy,
    notifyAt: parsed.data.notifyAt as IsoTimestamp | undefined,
    respondedAt: undefined,
    completedAt: undefined,
    createdAt: now,
    updatedAt: now,
  };

  return ok(assignment);
}

const ALLOWED_REVIEWER_TRANSITIONS: Readonly<Record<ReviewerStatus, readonly ReviewerStatus[]>> = {
  assigned: ["accepted", "declined"],
  accepted: ["completed", "declined"],
  declined: [],
  completed: [],
};

export function transitionReviewerStatus(
  assignment: ReviewerAssignment,
  next: ReviewerStatus,
): Result<ReviewerAssignment, ReviewerNotFoundError> {
  if (!ALLOWED_REVIEWER_TRANSITIONS[assignment.status].includes(next)) {
    return err(
      new ReviewerNotFoundError(
        `Cannot transition reviewer ${assignment.reviewerId} from ${assignment.status} to ${next}`,
      ),
    );
  }

  const now = epochToIso(Date.now());
  return ok({
    ...assignment,
    status: next,
    updatedAt: now,
    respondedAt: (next === "accepted" || next === "declined") ? now : assignment.respondedAt,
    completedAt: next === "completed" ? now : assignment.completedAt,
  });
}

export function isReviewerActive(assignment: ReviewerAssignment): boolean {
  return assignment.status === "assigned" || assignment.status === "accepted";
}
