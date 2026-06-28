// Assemble stage: build the final VerificationReport from the scored pipeline context.

import { ok, contentHash, epochToIso } from "@veritas/core";
import type { Stage } from "../pipeline/stage.js";
import type { VerificationContext } from "../pipeline/context.js";
import type { ScoredContext } from "./score.js";
import type {
  VerificationReport,
  VerificationReportClaim,
  ReportCitation,
  ReportProvenance,
} from "@veritas/contracts";
import { InternalError } from "@veritas/core";

/** Extended context fields produced by the assemble stage. */
export interface AssembledContext extends VerificationContext {
  readonly report: VerificationReport;
}

/** Generate a human-readable one-paragraph summary from verdict counts. */
function buildSummary(
  trustScore: number,
  supported: number,
  refuted: number,
  unverifiable: number,
  total: number,
): string {
  if (total === 0) {
    return "No verifiable claims were found in the submitted text.";
  }
  const pct = Math.round(trustScore);
  const parts: string[] = [];
  if (supported > 0) parts.push(`${supported} supported`);
  if (refuted > 0) parts.push(`${refuted} refuted`);
  if (unverifiable > 0) parts.push(`${unverifiable} unverifiable`);
  const breakdown = parts.join(", ");
  return (
    `Verification complete. Overall trust score: ${pct}/100. ` +
    `Of ${total} claim${total !== 1 ? "s" : ""} examined: ${breakdown}.`
  );
}

/** Detect the primary model used across all adjudications (most frequent). */
function detectPrimaryModel(ctx: VerificationContext): string {
  const counts = new Map<string, number>();
  for (const adj of ctx.adjudications.values()) {
    counts.set(adj.modelId, (counts.get(adj.modelId) ?? 0) + 1);
  }
  if (counts.size === 0) return "unknown";
  let best = "unknown";
  let bestCount = 0;
  for (const [model, count] of counts) {
    if (count > bestCount) {
      best = model;
      bestCount = count;
    }
  }
  return best;
}

/** Count unique source URLs across all adjudicated claims. */
function countSources(ctx: VerificationContext): number {
  const urls = new Set<string>();
  for (const ac of ctx.adjudicatedClaims) {
    for (const cit of ac.citations) {
      urls.add(cit.url);
    }
  }
  return urls.size;
}

/**
 * Assemble stage: converts fully adjudicated + scored context into a
 * structured VerificationReport conforming to the contracts schema.
 */
export const assembleStage: Stage = {
  name: "assemble",

  async run(ctx: VerificationContext) {
    // Narrowing: trust that the score stage populated trustScore and verdictCounts.
    const scored = ctx as ScoredContext;
    if (scored.trustScore === undefined || scored.verdictCounts === undefined) {
      return {
        ok: false,
        error: new InternalError({
          message: "assembleStage: score stage output missing from context",
        }),
      } as const;
    }

    const { trustScore, verdictCounts } = scored;
    const { supported, refuted, unverifiable, total } = verdictCounts;

    // Build per-claim rows.
    const claims: VerificationReportClaim[] = ctx.adjudicatedClaims.map((ac) => {
      const citations: ReportCitation[] = ac.citations.map((c) => ({
        url: c.url,
        title: c.title ?? null,
        quote: c.quote ?? null,
        supports: true,
      }));

      return {
        claim: ac.claim.text,
        verdict: ac.verdict,
        confidence: ac.confidence,
        reasoning: ac.reasoning,
        citations,
      };
    });

    // Compute provenance hash over the claims payload (before embedding it in the report).
    const claimsHash = contentHash(claims);

    const primaryModel = detectPrimaryModel(ctx);
    const sourceCount = countSources(ctx);
    const createdAt = epochToIso(Date.now());

    const provenance: ReportProvenance = {
      contentHash: claimsHash,
      verifier: ctx.options.verifier ?? "veritas",
      verifierVersion: ctx.options.verifierVersion ?? "1.0.0",
      model: primaryModel,
      effort: ctx.options.effort ?? "standard",
      createdAt,
      claimCount: total,
      sourceCount,
    };

    const trustScorePercent = Math.round(trustScore * 100);

    const summary = buildSummary(
      trustScorePercent,
      supported,
      refuted,
      unverifiable,
      total,
    );

    const report: VerificationReport = {
      schema: "veritas.report.v1",
      summary,
      trustScore: trustScorePercent,
      counts: { supported, refuted, unverifiable },
      claims,
      provenance,
    };

    const assembled: AssembledContext = {
      ...ctx,
      report,
    };

    return ok(assembled);
  },
};
