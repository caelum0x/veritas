// get-trust-score function tool: computes overall trust score from a list of adjudicated claims.

import { z } from "zod";
import { toAppError, clampScore, ValidationError } from "@veritas/core";
import { computeTrustScore } from "@veritas/verification";
import type { FunctionTool } from "../tool.js";
import { toolSuccess, toolFailure } from "../result.js";

const inputSchema = z.object({
  claims: z
    .array(
      z.object({
        verdict: z.enum(["SUPPORTED", "REFUTED", "UNVERIFIABLE"]),
        confidence: z.number().min(0).max(1),
      })
    )
    .min(1, "At least one claim is required"),
});

export interface TrustScoreOutput {
  readonly trustScore: number;
  readonly verdictCounts: {
    readonly supported: number;
    readonly refuted: number;
    readonly unverifiable: number;
    readonly total: number;
  };
}

/** Tally verdict outcomes from the claims list. */
function tallyVerdicts(
  claims: ReadonlyArray<{ verdict: string }>
): TrustScoreOutput["verdictCounts"] {
  let supported = 0;
  let refuted = 0;
  let unverifiable = 0;
  for (const { verdict } of claims) {
    if (verdict === "SUPPORTED") supported++;
    else if (verdict === "REFUTED") refuted++;
    else unverifiable++;
  }
  return { supported, refuted, unverifiable, total: claims.length };
}

/** FunctionTool definition for computing an aggregated trust score. */
export const getTrustScoreTool: FunctionTool<typeof inputSchema> = {
  name: "get_trust_score" as FunctionTool<typeof inputSchema>["name"],
  description:
    "Compute an overall trust score (0–1) from a list of adjudicated claims. " +
    "Returns the confidence-weighted verdict aggregate and verdict breakdown counts.",
  inputSchema,

  async handler(rawInput: unknown) {
    const parsed = inputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return toolFailure(
        "get_trust_score",
        new ValidationError({ message: parsed.error.message })
      );
    }

    try {
      const { claims } = parsed.data;
      const scoredClaims = claims.map((c) => ({
        verdict: c.verdict as "SUPPORTED" | "REFUTED" | "UNVERIFIABLE",
        confidence: clampScore(c.confidence),
      }));

      const trustScore = computeTrustScore(scoredClaims);
      const verdictCounts = tallyVerdicts(scoredClaims);

      return toolSuccess("get_trust_score", {
        trustScore,
        verdictCounts,
      } satisfies TrustScoreOutput);
    } catch (e) {
      return toolFailure("get_trust_score", toAppError(e));
    }
  },
};
