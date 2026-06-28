// Access review report generation — aggregates decisions into a structured compliance report.
import { z } from "zod";
import { type Result, ok, err, newId, epochToIso } from "@veritas/core";
import { type ReviewStats } from "./types.js";
import type { AccessReview } from "./review.js";
import type { ReviewDecision } from "./decision.js";
import type { ReviewerAssignment } from "./reviewer.js";
import { AccessReviewNotFoundError } from "./errors.js";

export const ReviewReportSchema = z.object({
  id: z.string().min(1),
  reviewId: z.string().min(1),
  organizationId: z.string().min(1),
  reviewName: z.string(),
  dueAt: z.string().datetime(),
  stats: z.object({
    totalEntitlements: z.number().int().nonnegative(),
    approved: z.number().int().nonnegative(),
    revoked: z.number().int().nonnegative(),
    abstained: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
  }),
  reviewerSummaries: z.array(
    z.object({
      reviewerId: z.string(),
      reviewerEmail: z.string(),
      displayName: z.string(),
      completed: z.number().int().nonnegative(),
    })
  ),
  revokedEntitlements: z.array(
    z.object({
      entitlementId: z.string(),
      reviewerId: z.string(),
      justification: z.string(),
    })
  ),
  generatedAt: z.string().datetime(),
});

export type ReviewReport = z.infer<typeof ReviewReportSchema>;

export interface ReportInput {
  readonly review: AccessReview;
  readonly decisions: readonly ReviewDecision[];
  readonly reviewers: readonly ReviewerAssignment[];
  readonly totalEntitlements: number;
}

function computeStats(
  decisions: readonly ReviewDecision[],
  totalEntitlements: number
): ReviewStats {
  let approved = 0;
  let revoked = 0;
  let abstained = 0;
  for (const d of decisions) {
    if (d.outcome === "approve") approved++;
    else if (d.outcome === "revoke") revoked++;
    else if (d.outcome === "escalate") abstained++;
  }
  const pending = totalEntitlements - decisions.length;
  return { totalEntitlements, approved, revoked, abstained, pending: Math.max(0, pending) };
}

function buildReviewerSummaries(
  reviewers: readonly ReviewerAssignment[],
  decisions: readonly ReviewDecision[]
): ReviewReport["reviewerSummaries"] {
  return reviewers.map((r) => {
    const completed = decisions.filter((d) => d.reviewerId === r.reviewerId).length;
    return {
      reviewerId: r.reviewerId,
      reviewerEmail: r.reviewerEmail,
      displayName: r.displayName,
      completed,
    };
  });
}

function buildRevokedEntitlements(
  decisions: readonly ReviewDecision[]
): ReviewReport["revokedEntitlements"] {
  return decisions
    .filter((d) => d.outcome === "revoke")
    .map((d) => ({
      entitlementId: String(d.entitlementId),
      reviewerId: d.reviewerId,
      justification: d.justification,
    }));
}

export function generateReport(input: ReportInput): Result<ReviewReport> {
  const { review, decisions, reviewers, totalEntitlements } = input;
  if (!review) {
    return err(new AccessReviewNotFoundError("unknown"));
  }
  const stats = computeStats(decisions, totalEntitlements);
  const reviewerSummaries = buildReviewerSummaries(reviewers, decisions);
  const revokedEntitlements = buildRevokedEntitlements(decisions);

  const report: ReviewReport = {
    id: newId("rreport"),
    reviewId: String(review.id),
    organizationId: review.orgId,
    reviewName: review.name,
    dueAt: review.dueAt,
    stats,
    reviewerSummaries,
    revokedEntitlements,
    generatedAt: epochToIso(Date.now()),
  };

  const parsed = ReviewReportSchema.safeParse(report);
  if (!parsed.success) {
    return err(new AccessReviewNotFoundError(parsed.error.message));
  }
  return ok(parsed.data);
}

export function reportCompletionRate(report: ReviewReport): number {
  const { totalEntitlements, pending } = report.stats;
  if (totalEntitlements === 0) return 1;
  return (totalEntitlements - pending) / totalEntitlements;
}

export function reportRevokeRate(report: ReviewReport): number {
  const { totalEntitlements, revoked } = report.stats;
  if (totalEntitlements === 0) return 0;
  return revoked / totalEntitlements;
}

// Re-export for consumers that referenced the old type names
export type { AccessReview as ReviewCampaign };
export type { ReviewDecision as AccessDecision };
