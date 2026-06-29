// Refine-citations stage: deduplicate each adjudicated claim's citations via an optional refiner.

import type { VerificationContext, AdjudicatedClaim } from "../pipeline/context.js";

/**
 * Pipeline stage that runs the configured `CitationRefiner` (if any) over every
 * adjudicated claim's citations — collapsing duplicate sources/quotes before the
 * report is assembled. Runs after adjudication; no-op when no refiner is set or
 * a claim has fewer than two citations.
 */
export async function refineCitationsStage(ctx: VerificationContext): Promise<void> {
  const refiner = ctx.options.citationRefiner;
  if (refiner === undefined || ctx.adjudicatedClaims.length === 0) {
    return;
  }

  let removed = 0;
  const refined: AdjudicatedClaim[] = ctx.adjudicatedClaims.map((ac) => {
    if (ac.citations.length < 2) return ac;
    const deduped = refiner.dedupe(ac.citations);
    removed += ac.citations.length - deduped.length;
    return { ...ac, citations: deduped };
  });

  ctx.adjudicatedClaims = refined;

  ctx.logger.debug("refine-citations: applied", {
    verificationId: ctx.verificationId,
    claims: refined.length,
    duplicatesRemoved: removed,
  });
}
