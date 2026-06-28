// Maps domain ReportView projections to HTTP response shapes.
import type { ReportView, ReportClaimView, ReportVerdictCountsView } from "@veritas/services";

/** HTTP response shape for a single verification report. */
export interface ReportResponse {
  readonly id: string;
  readonly verificationId: string;
  readonly contentHash: string;
  readonly summary: string;
  readonly trustScore: number;
  readonly counts: {
    readonly supported: number;
    readonly refuted: number;
    readonly unverifiable: number;
  };
  readonly claims: ReadonlyArray<{
    readonly claim: string;
    readonly verdict: string;
    readonly confidence: number;
    readonly reasoning: string;
    readonly citationIds: readonly string[];
  }>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Convert a domain ReportView to the HTTP response data shape. */
export function toReportResponse(view: ReportView): ReportResponse {
  return {
    id: view.id,
    verificationId: view.verificationId,
    contentHash: view.contentHash,
    summary: view.summary,
    trustScore: view.trustScore,
    counts: {
      supported: view.counts.supported,
      refuted: view.counts.refuted,
      unverifiable: view.counts.unverifiable,
    },
    claims: view.claims.map((c) => ({
      claim: c.claim,
      verdict: c.verdict,
      confidence: c.confidence,
      reasoning: c.reasoning,
      citationIds: [...c.citationIds],
    })),
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
  };
}
