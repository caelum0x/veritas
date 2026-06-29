// Assemble a complete VerificationReport from a fully scored verification context.

import type {
  VerificationReport,
  VerificationReportClaim,
  ReportCitation,
} from "@veritas/contracts";
import { clampScore, formatScorePercent } from "@veritas/core";
import type { Score } from "@veritas/core";
import type { VerificationContext } from "../pipeline/context.js";
import type { AdjudicatedClaim, PipelineCitation } from "../pipeline/context.js";
import type { ScoredContext } from "../stages/score.js";
import { buildAttestation } from "../provenance/attestation.js";
import type { AttestationInput } from "../provenance/attestation.js";

/** Fully scored context required to build a report. */
export type BuilderContext = VerificationContext & Pick<ScoredContext, "verdictCounts">;

/**
 * Convert a PipelineCitation to the public ReportCitation shape.
 */
function toReportCitation(c: PipelineCitation): ReportCitation {
  return {
    url: c.url,
    title: c.title,
    quote: c.quote,
    supports: c.supports,
  };
}

/**
 * Convert an AdjudicatedClaim to the public VerificationReportClaim shape.
 * The confidence Score (0–1) is passed through as-is.
 */
function toReportClaim(ac: AdjudicatedClaim): VerificationReportClaim {
  return {
    claim: ac.claim.text,
    verdict: ac.verdict,
    confidence: ac.confidence as number,
    reasoning: ac.reasoning,
    citations: ac.citations.map(toReportCitation),
  };
}

/**
 * Convert a Score (0–1 float) to the public 0–100 percentage integer used in the report.
 */
function scoreToPercent(score: Score): number {
  return Math.round(clampScore(score as number) * 100);
}

/**
 * Produce a one-line human summary for the report header.
 * Delegates full prose generation to src/report/summary.ts; here we emit a
 * compact baseline that the summary stage can later replace.
 */
function buildSummary(ctx: BuilderContext): string {
  const { verdictCounts } = ctx;
  const total = verdictCounts.total;
  if (total === 0) return "No claims were identified in the submitted content.";

  const pct = scoreToPercent(ctx.trustScore as Score);
  const parts: string[] = [];
  if (verdictCounts.supported > 0)
    parts.push(`${verdictCounts.supported} supported`);
  if (verdictCounts.refuted > 0)
    parts.push(`${verdictCounts.refuted} refuted`);
  if (verdictCounts.unverifiable > 0)
    parts.push(`${verdictCounts.unverifiable} unverifiable`);

  return (
    `Verified ${total} claim${total === 1 ? "" : "s"} ` +
    `(${parts.join(", ")}). Overall trust score: ${pct}%.`
  );
}

/**
 * Build and return a complete VerificationReport.
 *
 * The report schema version is locked to "veritas.report.v1".
 * trustScore is expressed as a 0–100 percentage integer in the public contract.
 */
export function buildReport(ctx: BuilderContext): VerificationReport {
  const trustScorePercent = scoreToPercent(ctx.trustScore as Score);

  const claims: VerificationReportClaim[] = ctx.adjudicatedClaims
    .slice()
    .sort((a, b) => a.claim.order - b.claim.order)
    .map(toReportClaim);

  const provenance = buildAttestation(ctx as AttestationInput);

  return {
    schema: "veritas.report.v1",
    summary: buildSummary(ctx),
    trustScore: trustScorePercent,
    counts: {
      supported: ctx.verdictCounts.supported,
      refuted: ctx.verdictCounts.refuted,
      unverifiable: ctx.verdictCounts.unverifiable,
    },
    claims,
    provenance,
  };
}
