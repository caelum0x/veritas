// Legal confidence scoring: aggregate rule results into a verdict + score breakdown.
import { asScore, clampScore, type Score, type Verdict } from "@veritas/core";
import type { LegalRuleResult, LegalScoreBreakdown, StatuteRecord, CaseLawRecord } from "./types.js";

const WEIGHTS = {
  citationAccuracy: 0.40,
  sourceAuthority: 0.30,
  jurisdictionRelevance: 0.15,
  currentness: 0.15,
} as const;

/** Score how current the legal source is. Statutes enacted long ago score lower if unverified recently. */
function scoreCurrentness(
  statute: StatuteRecord | undefined,
  caseRecord: CaseLawRecord | undefined,
): number {
  const now = Date.now();
  const scores: number[] = [];

  if (statute?.lastVerifiedAt) {
    const ageMs = now - new Date(statute.lastVerifiedAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    // Penalise data not verified within 1 year linearly; floor at 0.3.
    scores.push(Math.max(0.3, 1 - ageDays / 365));
  }

  if (caseRecord?.retrievedAt) {
    const ageMs = now - new Date(caseRecord.retrievedAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    scores.push(Math.max(0.3, 1 - ageDays / 730));
  }

  if (scores.length === 0) return 0.3;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/** Score source authority based on URL origin and record provenance. */
function scoreSourceAuthority(
  statute: StatuteRecord | undefined,
  caseRecord: CaseLawRecord | undefined,
  ruleResults: ReadonlyArray<LegalRuleResult>,
): number {
  let base = 0.5;

  const urls = [statute?.sourceUrl, caseRecord?.sourceUrl].filter(Boolean) as string[];
  for (const url of urls) {
    const lower = url.toLowerCase();
    if (lower.includes("congress.gov") || lower.includes("govinfo.gov") || lower.includes("supremecourt.gov")) {
      base = Math.max(base, 1.0);
    } else if (lower.includes(".gov") || lower.includes("courtlistener.com") || lower.includes("law.cornell.edu")) {
      base = Math.max(base, 0.85);
    } else if (lower.includes("westlaw") || lower.includes("lexisnexis")) {
      base = Math.max(base, 0.8);
    } else {
      base = Math.max(base, 0.65);
    }
  }

  // Reduce if unverifiable rules dominate.
  const unverifiableCount = ruleResults.filter(r => r.verdict === "UNVERIFIABLE").length;
  return Math.max(0, base - unverifiableCount * 0.05);
}

/** Score jurisdiction relevance from rule results. */
function scoreJurisdictionRelevance(ruleResults: ReadonlyArray<LegalRuleResult>): number {
  const jurisdictionRule = ruleResults.find(r => r.ruleId === "jurisdiction-match");
  if (!jurisdictionRule) return 0.4;
  return jurisdictionRule.score;
}

/** Compute citation accuracy as weighted mean of rule scores. */
function scoreCitationAccuracy(ruleResults: ReadonlyArray<LegalRuleResult>): number {
  if (ruleResults.length === 0) return 0.0;
  return ruleResults.reduce((sum, r) => sum + r.score, 0) / ruleResults.length;
}

/** Map weighted score to a Verdict for a legal claim. */
function overallVerdict(score: number, ruleResults: ReadonlyArray<LegalRuleResult>): Verdict {
  const hasRefuted = ruleResults.some(r => r.verdict === "REFUTED");
  if (hasRefuted && score < 0.4) return "REFUTED";
  if (score >= 0.75) return "SUPPORTED";
  if (score >= 0.55) return "UNVERIFIABLE";
  if (score >= 0.35) return "UNVERIFIABLE";
  return "REFUTED";
}

/** Produce a full scoring breakdown from rule results and available source data. */
export function computeLegalScore(
  ruleResults: ReadonlyArray<LegalRuleResult>,
  statute: StatuteRecord | undefined,
  caseRecord: CaseLawRecord | undefined,
): LegalScoreBreakdown {
  const citationAccuracy = scoreCitationAccuracy(ruleResults);
  const sourceAuthority = scoreSourceAuthority(statute, caseRecord, ruleResults);
  const jurisdictionRelevance = scoreJurisdictionRelevance(ruleResults);
  const currentness = scoreCurrentness(statute, caseRecord);

  const overallRaw =
    citationAccuracy * WEIGHTS.citationAccuracy +
    sourceAuthority * WEIGHTS.sourceAuthority +
    jurisdictionRelevance * WEIGHTS.jurisdictionRelevance +
    currentness * WEIGHTS.currentness;

  const overallScore: Score = asScore(clampScore(overallRaw));
  const verdict = overallVerdict(overallScore, ruleResults);

  const primarySourceUrl = statute?.sourceUrl ?? caseRecord?.sourceUrl;

  return Object.freeze({
    overallScore,
    verdict,
    citationAccuracy: clampScore(citationAccuracy),
    sourceAuthority: clampScore(sourceAuthority),
    jurisdictionRelevance: clampScore(jurisdictionRelevance),
    currentness: clampScore(currentness),
    rulesPassed: ruleResults.filter(r => r.passed).length,
    rulesTotal: ruleResults.length,
    primarySourceUrl,
  });
}
