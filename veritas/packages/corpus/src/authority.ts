// Authority weighting: compute and adjust authority scores for corpus records.

import { z } from "zod";
import { scoreSchema, type Score, asScore, clampScore, type Result, ok, err, ValidationError } from "@veritas/core";
import { type SourceTier } from "@veritas/core";
import { type CorpusRecord } from "./record.js";
import { type Source } from "@veritas/contracts";

const TIER_BASE: Record<SourceTier, number> = {
  PRIMARY: 1.0,
  SECONDARY: 0.7,
  TERTIARY: 0.4,
  UNKNOWN: 0.2,
};

export const AuthorityFactorsSchema = z.object({
  citationCount: z.number().int().nonnegative().optional(),
  peerReviewed: z.boolean().optional(),
  governmentSource: z.boolean().optional(),
  retracted: z.boolean().optional(),
  ageYears: z.number().nonnegative().optional(),
});

export type AuthorityFactors = z.infer<typeof AuthorityFactorsSchema>;

export interface AuthorityAdjustment {
  readonly recordId: string;
  readonly previousWeight: Score;
  readonly newWeight: Score;
  readonly factors: AuthorityFactors;
}

function agePenalty(ageYears: number): number {
  // Gentle decay: half-life of ~10 years
  return Math.pow(0.5, ageYears / 10);
}

function citationBonus(count: number): number {
  // Logarithmic bonus capped at 0.2
  return Math.min(0.2, Math.log10(count + 1) * 0.05);
}

export function computeAuthorityWeight(
  source: Source,
  factors: AuthorityFactors = {},
): Score {
  let weight = TIER_BASE[source.tier] ?? TIER_BASE.UNKNOWN;

  if (factors.retracted === true) {
    return asScore(0);
  }

  if (factors.peerReviewed === true) {
    weight += 0.1;
  }

  if (factors.governmentSource === true) {
    weight += 0.05;
  }

  if (factors.citationCount !== undefined && factors.citationCount > 0) {
    weight += citationBonus(factors.citationCount);
  }

  if (factors.ageYears !== undefined && factors.ageYears > 0) {
    weight *= agePenalty(factors.ageYears);
  }

  return clampScore(weight);
}

export function adjustAuthorityWeight(
  record: CorpusRecord,
  factors: AuthorityFactors,
): Result<AuthorityAdjustment> {
  const parsed = AuthorityFactorsSchema.safeParse(factors);
  if (!parsed.success) {
    return err(
      new ValidationError({
        message: "Invalid authority factors",
        details: { issues: parsed.error.issues },
      }),
    );
  }

  const newWeight = computeAuthorityWeight(record.source, parsed.data);

  const adjustment: AuthorityAdjustment = {
    recordId: record.id,
    previousWeight: record.authorityWeight as Score,
    newWeight,
    factors: parsed.data,
  };
  return ok(adjustment);
}

export function rankByAuthority(
  records: readonly CorpusRecord[],
): readonly CorpusRecord[] {
  return [...records].sort((a, b) => b.authorityWeight - a.authorityWeight);
}
