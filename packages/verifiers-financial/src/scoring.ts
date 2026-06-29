// Financial confidence scoring: aggregate rule results into a verdict + score breakdown.
import { asScore, clampScore, type Score, type Verdict } from "@veritas/core";
import type { RuleResult, FinancialScoreBreakdown, CompanyFundamentals, MarketSnapshot } from "./types.js";

const WEIGHTS = {
  numericAccuracy: 0.45,
  sourceReliability: 0.25,
  recency: 0.15,
  consistency: 0.15,
} as const;

/** Score data source recency: newer data scores higher. */
function scoreRecency(fundamentals: CompanyFundamentals | undefined, snapshot: MarketSnapshot | undefined): number {
  const now = Date.now();
  const ages: number[] = [];

  if (fundamentals?.reportedAt) {
    const age = now - new Date(fundamentals.reportedAt).getTime();
    // Penalise data older than 90 days linearly, cap penalty at 1 year.
    const ageDays = age / (1000 * 60 * 60 * 24);
    ages.push(Math.max(0, 1 - ageDays / 365));
  }
  if (snapshot?.asOf) {
    const age = now - new Date(snapshot.asOf).getTime();
    const ageHours = age / (1000 * 60 * 60);
    // Market data older than 24 h scores 0.
    ages.push(Math.max(0, 1 - ageHours / 24));
  }

  if (ages.length === 0) return 0.3;
  return ages.reduce((a, b) => a + b, 0) / ages.length;
}

/** Score source reliability based on whether official sources (EDGAR URL) are present. */
function scoreSourceReliability(fundamentals: CompanyFundamentals | undefined, ruleResults: ReadonlyArray<RuleResult>): number {
  let base = 0.5;
  if (fundamentals?.sourceUrl) {
    const url = fundamentals.sourceUrl.toLowerCase();
    if (url.includes("sec.gov") || url.includes("edgar")) base = 1.0;
    else if (url.includes("bloomberg") || url.includes("reuters")) base = 0.85;
    else base = 0.7;
  }
  // Slight penalty if any rule produced UNVERIFIABLE verdict.
  const unverifiableCount = ruleResults.filter(r => r.verdict === "UNVERIFIABLE").length;
  return Math.max(0, base - unverifiableCount * 0.05);
}

/** Score internal consistency across rule results. */
function scoreConsistency(ruleResults: ReadonlyArray<RuleResult>): number {
  if (ruleResults.length === 0) return 0.0;
  const verdicts = ruleResults.map(r => r.verdict);
  const unique = new Set(verdicts).size;
  // Fully consistent = 1.0; each extra verdict class reduces by 0.2.
  return Math.max(0, 1 - (unique - 1) * 0.2);
}

/** Compute numeric accuracy as the weighted mean of rule scores. */
function scoreNumericAccuracy(ruleResults: ReadonlyArray<RuleResult>): number {
  if (ruleResults.length === 0) return 0.0;
  return ruleResults.reduce((sum, r) => sum + r.score, 0) / ruleResults.length;
}

/** Map a weighted overall score to a Verdict. */
function overallVerdict(score: number, ruleResults: ReadonlyArray<RuleResult>): Verdict {
  const hasRefuted = ruleResults.some(r => r.verdict === "REFUTED");
  if (hasRefuted && score < 0.4) return "REFUTED";
  if (score >= 0.75) return "SUPPORTED";
  if (score >= 0.35) return "UNVERIFIABLE";
  return "REFUTED";
}

/** Produce a full scoring breakdown from rule results and available source data. */
export function computeFinancialScore(
  ruleResults: ReadonlyArray<RuleResult>,
  fundamentals: CompanyFundamentals | undefined,
  snapshot: MarketSnapshot | undefined,
): FinancialScoreBreakdown {
  const numericAccuracy = scoreNumericAccuracy(ruleResults);
  const sourceReliability = scoreSourceReliability(fundamentals, ruleResults);
  const recency = scoreRecency(fundamentals, snapshot);
  const consistency = scoreConsistency(ruleResults);

  const overallRaw =
    numericAccuracy * WEIGHTS.numericAccuracy +
    sourceReliability * WEIGHTS.sourceReliability +
    recency * WEIGHTS.recency +
    consistency * WEIGHTS.consistency;

  const overallScore: Score = asScore(clampScore(overallRaw));
  const verdict = overallVerdict(overallScore, ruleResults);

  const primarySourceUrl =
    fundamentals?.sourceUrl ??
    ruleResults.flatMap(r => Object.values(r.details ?? {})).find((v): v is string => typeof v === "string" && v.startsWith("http"));

  return Object.freeze({
    overallScore,
    verdict,
    numericAccuracy: clampScore(numericAccuracy),
    sourceReliability: clampScore(sourceReliability),
    recency: clampScore(recency),
    consistency: clampScore(consistency),
    rulesPassed: ruleResults.filter(r => r.passed).length,
    rulesTotal: ruleResults.length,
    primarySourceUrl,
  });
}
