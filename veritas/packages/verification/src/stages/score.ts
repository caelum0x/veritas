// Score stage: compute the aggregate trust score and verdict counts from adjudicated claims.

import { ok } from "@veritas/core";
import type { Score } from "@veritas/core";
import type { Stage } from "../pipeline/stage.js";
import type { VerificationContext } from "../pipeline/context.js";
import { computeTrustScore, tallyVerdicts } from "../scoring/trust-score.js";
import type { VerdictCounts } from "../scoring/trust-score.js";

/** Extended context fields populated by the score stage. */
export interface ScoreStageOutput {
  readonly trustScore: Score;
  readonly verdictCounts: VerdictCounts;
}

/** Attach trustScore and verdictCounts to context after scoring. */
export type ScoredContext = VerificationContext & ScoreStageOutput;

/**
 * Score stage: iterates adjudicatedClaims, delegates to the trust-score module,
 * and merges the results into the context for the assemble stage.
 */
export const scoreStage: Stage = {
  name: "score",

  async run(ctx: VerificationContext) {
    const scoredClaims = ctx.adjudicatedClaims.map((ac) => ({
      verdict: ac.verdict,
      confidence: ac.confidence,
    }));

    const trustScore = computeTrustScore(scoredClaims);
    const verdictCounts = tallyVerdicts(scoredClaims);

    const updated: ScoredContext = {
      ...ctx,
      trustScore,
      verdictCounts,
    };

    return ok(updated);
  },
};
