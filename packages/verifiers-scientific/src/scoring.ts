// Scientific confidence scoring: derives confidence values from evidence quality metrics.
import { clampScore, type Score, asScore } from "@veritas/core";
import type { PaperMetadata, ScientificVerdictContext } from "./types.js";
import {
  hasHighImpactSupport,
  hasRetractedSource,
  isPreprintOnly,
  hasContradiction,
  hasSufficientEvidence,
  hasReplicationEvidence,
  peerReviewWeight,
} from "./rules.js";

/** Compute a weighted relevance score for a single paper relative to the claim. */
export function scorePaper(paper: PaperMetadata, baseCitationThreshold = 100): Score {
  if (paper.isRetracted) return asScore(0);

  const tierWeight = peerReviewWeight(paper);
  const citationScore = Math.min(1, (paper.citationCount ?? 0) / baseCitationThreshold);
  const statusPenalty = paper.publicationStatus === "published" ? 1 : 0.6;

  const raw = tierWeight * 0.6 + citationScore * 0.3 + statusPenalty * 0.1;
  return clampScore(raw);
}

/** Compute aggregate confidence score [0,1] from a ScientificVerdictContext. */
export function computeScientificConfidence(ctx: ScientificVerdictContext): Score {
  if (ctx.papersFound === 0) return asScore(0.05);

  let score = 0.3;

  if (hasHighImpactSupport(ctx)) score += 0.25;
  if (hasSufficientEvidence(ctx)) score += 0.15;
  if (hasReplicationEvidence(ctx)) score += 0.10;
  if (isPreprintOnly(ctx)) score -= 0.20;
  if (hasRetractedSource(ctx)) score -= 0.30;
  if (hasContradiction(ctx)) score -= 0.15;

  // Bonus for ratio of high-impact to total
  const highImpactRatio = ctx.papersFound > 0 ? ctx.highImpactSupport / ctx.papersFound : 0;
  score += highImpactRatio * 0.10;

  return clampScore(score);
}

/** Compute a support ratio [0,1] from verdict context. */
export function computeSupportRatio(ctx: ScientificVerdictContext): number {
  const total = ctx.papersFound;
  if (total === 0) return 0;
  const supporting = total - ctx.contradictingPapers;
  return Math.max(0, supporting / total);
}

/** Map an array of papers to a single aggregated quality score. */
export function aggregatePaperScores(papers: ReadonlyArray<PaperMetadata>): Score {
  if (papers.length === 0) return asScore(0);
  const total = papers.reduce((sum, p) => sum + scorePaper(p), 0);
  return clampScore(total / papers.length);
}

/** Compute signal weight for the scientific verifier based on evidence quality. */
export function computeSignalWeight(ctx: ScientificVerdictContext, papers: ReadonlyArray<PaperMetadata>): number {
  const paperQuality = papers.length > 0 ? aggregatePaperScores(papers) : 0;
  const sufficiency = hasSufficientEvidence(ctx) ? 1.0 : 0.6;
  return Math.min(1, paperQuality * sufficiency);
}
