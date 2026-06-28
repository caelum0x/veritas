// Medical confidence scoring: converts evidence summaries to normalized confidence scores.
import { clampScore, meanScore, type Score, asScore } from "@veritas/core";
import type { EvidenceGrade } from "./types.js";
import type { MedicalEvidenceSummary } from "./types.js";

/** Numeric weight assigned to each evidence grade (I = highest, V = lowest). */
const GRADE_WEIGHTS: Readonly<Record<EvidenceGrade, number>> = {
  I: 1.0,
  II: 0.8,
  III: 0.6,
  IV: 0.4,
  V: 0.2,
};

/** Score boost from matching authoritative guidelines. */
const GUIDELINE_MATCH_BOOST = 0.15;
/** Score boost from matching ICD codes (confirms claim specificity). */
const ICD_MATCH_BOOST = 0.10;
/** Score penalty per refuting source found. */
const REFUTING_SOURCE_PENALTY = 0.12;
/** Maximum contribution from supporting source count. */
const MAX_SOURCE_COUNT_BONUS = 0.20;

/** Convert an evidence grade to a base weight [0, 1]. */
export function gradeToWeight(grade: EvidenceGrade): number {
  return GRADE_WEIGHTS[grade];
}

/** Compute a base confidence score from evidence grade alone. */
export function scoreFromGrade(grade: EvidenceGrade | null): Score {
  if (grade == null) return asScore(0.3);
  return asScore(GRADE_WEIGHTS[grade]);
}

/** Score the consistency between supporting and refuting sources. */
function sourceConsistencyScore(supporting: number, refuting: number): number {
  const total = supporting + refuting;
  if (total === 0) return 0.3;
  return supporting / total;
}

/** Compute bonus from source count (logarithmic diminishing returns). */
function sourceCountBonus(supportingCount: number): number {
  if (supportingCount === 0) return 0;
  return Math.min(MAX_SOURCE_COUNT_BONUS, Math.log2(supportingCount + 1) * 0.05);
}

/**
 * Compute an overall medical confidence score [0, 1] from a MedicalEvidenceSummary.
 * Combines evidence grade, source consistency, guideline and ICD matches.
 */
export function computeMedicalConfidence(summary: MedicalEvidenceSummary): Score {
  const gradeScore = scoreFromGrade(summary.evidenceGrade);

  const consistencyScore = sourceConsistencyScore(
    summary.supportingSourceCount,
    summary.refutingSourceCount,
  );

  const guidelineBoost = summary.matchedGuidelines.length > 0 ? GUIDELINE_MATCH_BOOST : 0;
  const icdBoost = summary.matchedIcdCodes.length > 0 ? ICD_MATCH_BOOST : 0;
  const refutalPenalty = summary.refutingSourceCount * REFUTING_SOURCE_PENALTY;
  const sourceBonus = sourceCountBonus(summary.supportingSourceCount);

  const raw = meanScore([gradeScore, asScore(consistencyScore)])
    + guidelineBoost
    + icdBoost
    + sourceBonus
    - refutalPenalty;

  return clampScore(raw);
}

/**
 * Compute a drug-specific confidence modifier based on approval status and indications.
 * Returns a multiplicative factor [0.5, 1.0] to scale the base confidence.
 */
export function drugApprovalModifier(
  approvalStatus: "approved" | "investigational" | "withdrawn" | "not_approved",
  indicationMatches: number,
): number {
  const statusBase: Record<string, number> = {
    approved: 1.0,
    investigational: 0.65,
    withdrawn: 0.5,
    not_approved: 0.5,
  };
  const base = statusBase[approvalStatus] ?? 0.5;
  const indicationBonus = Math.min(0.15, indicationMatches * 0.05);
  return Math.min(1.0, base + indicationBonus);
}

/**
 * Combine a base confidence score with a drug approval modifier.
 * Returns a clamped Score.
 */
export function applyDrugModifier(base: Score, modifier: number): Score {
  return clampScore(base * modifier);
}
