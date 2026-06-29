// Domain-verify stage: consult an optional domain verifier per claim and fold
// its verdict into the claim's reasoning.

import type { VerificationContext, AdjudicatedClaim } from "../pipeline/context.js";

/**
 * Pipeline stage that runs the configured `DomainVerifierRouter` (if any) for
 * each adjudicated claim. When a specialized verifier handles a claim, its
 * verdict + rationale are appended to the claim's reasoning so the domain
 * evidence surfaces in the final report. No-op when no router is configured.
 *
 * Claims are processed concurrently; a router failure for one claim leaves that
 * claim unchanged rather than failing the whole run.
 */
export async function domainVerifyStage(ctx: VerificationContext): Promise<void> {
  const router = ctx.options.domainRouter;
  if (router === undefined || ctx.adjudicatedClaims.length === 0) {
    return;
  }

  const annotated: AdjudicatedClaim[] = await Promise.all(
    ctx.adjudicatedClaims.map(async (ac) => {
      try {
        const verdict = await router.verify(ac.claim.text);
        if (verdict === null) return ac;
        const note =
          `[domain:${verdict.verifierId}] ${verdict.verdict} ` +
          `(confidence ${verdict.confidence.toFixed(2)}): ${verdict.rationale}`;
        return { ...ac, reasoning: `${ac.reasoning}\n\n${note}` };
      } catch (e) {
        ctx.logger.warn("domain-verify: verifier failed for claim", {
          verificationId: ctx.verificationId,
          error: e instanceof Error ? e.message : String(e),
        });
        return ac;
      }
    }),
  );

  ctx.adjudicatedClaims = annotated;

  ctx.logger.debug("domain-verify: applied", {
    verificationId: ctx.verificationId,
    claims: annotated.length,
  });
}
