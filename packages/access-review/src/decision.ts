// Approve/revoke decision: record and validate reviewer decisions on entitlements.

import { z } from "zod";
import {
  type Result, ok, err, newId, type Id, type IsoTimestamp, epochToIso, ValidationError,
} from "@veritas/core";
import type { ReviewId } from "./review.js";
import type { EntitlementId } from "./entitlement.js";
import { DecisionAlreadyMadeError, ReviewAlreadyClosedError } from "./errors.js";
import type { AccessReview } from "./review.js";

export type DecisionId = Id<"rdecision">;
export const newDecisionId = (): DecisionId => newId("rdecision");

export type DecisionOutcome = "approve" | "revoke" | "escalate";

export const RecordDecisionSchema = z.object({
  reviewId: z.string().min(1),
  entitlementId: z.string().min(1),
  reviewerId: z.string().min(1),
  outcome: z.enum(["approve", "revoke", "escalate"]),
  justification: z.string().min(1).max(2000),
  metadata: z.record(z.string()).optional(),
});

export type RecordDecision = z.infer<typeof RecordDecisionSchema>;

export interface ReviewDecision {
  readonly id: DecisionId;
  readonly reviewId: ReviewId;
  readonly entitlementId: EntitlementId;
  readonly reviewerId: string;
  readonly outcome: DecisionOutcome;
  readonly justification: string;
  readonly metadata: Readonly<Record<string, string>>;
  readonly decidedAt: IsoTimestamp;
  readonly createdAt: IsoTimestamp;
}

export function recordDecision(
  input: unknown,
  review: AccessReview,
  existingDecisions: readonly ReviewDecision[],
): Result<ReviewDecision, ValidationError | DecisionAlreadyMadeError | ReviewAlreadyClosedError> {
  if (review.status === "completed" || review.status === "cancelled") {
    return err(new ReviewAlreadyClosedError(review.id));
  }

  const parsed = RecordDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return err(new ValidationError({ message: "Invalid decision input", cause: parsed.error }));
  }

  const alreadyDecided = existingDecisions.some(
    (d) => d.entitlementId === parsed.data.entitlementId,
  );
  if (alreadyDecided) {
    return err(new DecisionAlreadyMadeError(parsed.data.entitlementId));
  }

  const now = epochToIso(Date.now());
  const decision: ReviewDecision = {
    id: newDecisionId(),
    reviewId: parsed.data.reviewId as ReviewId,
    entitlementId: parsed.data.entitlementId as EntitlementId,
    reviewerId: parsed.data.reviewerId,
    outcome: parsed.data.outcome,
    justification: parsed.data.justification,
    metadata: Object.freeze({ ...parsed.data.metadata }),
    decidedAt: now,
    createdAt: now,
  };

  return ok(decision);
}

export function summarizeDecisions(decisions: readonly ReviewDecision[]): {
  readonly total: number;
  readonly approved: number;
  readonly revoked: number;
  readonly escalated: number;
} {
  const approved = decisions.filter((d) => d.outcome === "approve").length;
  const revoked = decisions.filter((d) => d.outcome === "revoke").length;
  const escalated = decisions.filter((d) => d.outcome === "escalate").length;
  return { total: decisions.length, approved, revoked, escalated };
}
