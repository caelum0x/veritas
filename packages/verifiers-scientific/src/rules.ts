// Scientific verification heuristics: rule functions that evaluate paper evidence quality.
import type { PaperMetadata, ScientificVerdictContext } from "./types.js";

/** Returns true if at least one high-impact peer-reviewed paper supports the claim. */
export function hasHighImpactSupport(ctx: ScientificVerdictContext): boolean {
  return ctx.highImpactSupport > 0;
}

/** Returns true if any referenced paper has been retracted. */
export function hasRetractedSource(ctx: ScientificVerdictContext): boolean {
  return ctx.retractedPapers > 0;
}

/** Returns true if all supporting papers are preprints (no peer review). */
export function isPreprintOnly(ctx: ScientificVerdictContext): boolean {
  return ctx.papersFound > 0 && ctx.preprintOnlySupport >= ctx.papersFound && ctx.highImpactSupport === 0;
}

/** Returns true if there is meaningful scientific contradiction found. */
export function hasContradiction(ctx: ScientificVerdictContext): boolean {
  return ctx.contradictingPapers > 0;
}

/** Returns true if the paper has sufficient citations to be considered established. */
export function isEstablishedPaper(paper: PaperMetadata, minCitations = 50): boolean {
  return (paper.citationCount ?? 0) >= minCitations &&
    paper.publicationStatus === "published" &&
    !paper.isRetracted;
}

/** Returns true if the paper is a valid peer-reviewed source. */
export function isValidPeerReviewedSource(paper: PaperMetadata): boolean {
  return (
    !paper.isRetracted &&
    (paper.peerReviewTier === "peer_reviewed" || paper.peerReviewTier === "high_impact") &&
    paper.publicationStatus === "published"
  );
}

/** Derive a quality multiplier [0, 1] from paper peer-review tier. */
export function peerReviewWeight(paper: PaperMetadata): number {
  if (paper.isRetracted) return 0;
  switch (paper.peerReviewTier) {
    case "high_impact": return 1.0;
    case "peer_reviewed": return 0.8;
    case "preprint_only": return 0.4;
    case "non_peer_reviewed": return 0.2;
    case "unknown": return 0.3;
  }
}

/** Returns true if claim cites no identifiable sources (dois/pmids/arxiv). */
export function hasNoIdentifiableSources(
  mentionedDois: readonly string[],
  mentionedPmids: readonly string[],
  mentionedArxivIds: readonly string[],
): boolean {
  return mentionedDois.length === 0 &&
    mentionedPmids.length === 0 &&
    mentionedArxivIds.length === 0;
}

/** Returns true if the verdict context has replication evidence (stronger claim). */
export function hasReplicationEvidence(ctx: ScientificVerdictContext): boolean {
  return ctx.hasReplication;
}

/** Minimum papers needed before rendering a high-confidence verdict. */
export const MIN_PAPERS_FOR_HIGH_CONFIDENCE = 3;

/** Returns true if the context has enough papers to render a reliable verdict. */
export function hasSufficientEvidence(ctx: ScientificVerdictContext): boolean {
  return ctx.papersFound >= MIN_PAPERS_FOR_HIGH_CONFIDENCE;
}
