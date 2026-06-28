// Maps @veritas/services ReportView projections to HTTP response shapes for the reports feature.
import type { ReportView } from "@veritas/services";

/** Verdict count breakdown embedded in a report HTTP response. */
export interface ReportCountsResponse {
  readonly supported: number;
  readonly refuted: number;
  readonly unverifiable: number;
}

/** Per-claim entry embedded in a report HTTP response. */
export interface ReportClaimResponse {
  readonly claim: string;
  readonly verdict: string;
  readonly confidence: number;
  readonly reasoning: string;
  readonly citationIds: readonly string[];
}

/** Full HTTP-facing report resource shape. */
export interface ReportResponse {
  readonly id: string;
  readonly verificationId: string;
  readonly contentHash: string;
  readonly summary: string;
  readonly trustScore: number;
  readonly counts: ReportCountsResponse;
  readonly claims: readonly ReportClaimResponse[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Map a service-layer ReportView to the HTTP response shape. */
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
