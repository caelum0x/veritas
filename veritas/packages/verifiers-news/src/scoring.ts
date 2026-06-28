// News confidence scoring: aggregate rule results into a verdict + score breakdown.
import { asScore, clampScore, type Score, type Verdict } from "@veritas/core";
import type { NewsRuleResult, NewsScoreBreakdown, NewsArticle, WireReport } from "./types.js";

const WEIGHTS = {
  outletCredibility: 0.30,
  corroboration: 0.30,
  recency: 0.20,
  wireConfirmation: 0.20,
} as const;

/** Extract score from a specific rule by ID, defaulting to 0 if absent. */
function ruleScore(results: ReadonlyArray<NewsRuleResult>, ruleId: string): number {
  return results.find((r) => r.ruleId === ruleId)?.score ?? 0;
}

/** Derive overall verdict from weighted score and rule signals. */
function overallVerdict(score: number, results: ReadonlyArray<NewsRuleResult>): Verdict {
  const hasRefuted = results.some((r) => r.verdict === "REFUTED");
  if (hasRefuted && score < 0.35) return "REFUTED";
  if (score >= 0.75) return "SUPPORTED";
  if (score >= 0.55) return "UNVERIFIABLE";
  if (score >= 0.35) return "UNVERIFIABLE";
  return "REFUTED";
}

/** Pick the best candidate primary source URL from articles and wire reports. */
function pickPrimaryUrl(
  articles: ReadonlyArray<NewsArticle>,
  wires: ReadonlyArray<WireReport>,
): string | undefined {
  const tier1 = articles.find((a) => a.outletTier === "tier1");
  if (tier1) return tier1.url;
  const wire = wires.find((w) => w.url != null);
  if (wire?.url) return wire.url;
  return articles[0]?.url;
}

/** Produce a full news scoring breakdown from rule results and available source data. */
export function computeNewsScore(
  ruleResults: ReadonlyArray<NewsRuleResult>,
  articles: ReadonlyArray<NewsArticle>,
  wires: ReadonlyArray<WireReport>,
): NewsScoreBreakdown {
  const outletCredibility = ruleScore(ruleResults, "outlet-credibility");
  const corroboration = ruleScore(ruleResults, "corroboration");
  const recency = ruleScore(ruleResults, "recency");
  const wireConfirmation = ruleScore(ruleResults, "wire-confirmation");

  const overallRaw =
    outletCredibility * WEIGHTS.outletCredibility +
    corroboration * WEIGHTS.corroboration +
    recency * WEIGHTS.recency +
    wireConfirmation * WEIGHTS.wireConfirmation;

  const overallScore: Score = asScore(clampScore(overallRaw));
  const verdict = overallVerdict(overallScore, ruleResults);
  const primarySourceUrl = pickPrimaryUrl(articles, wires);

  return Object.freeze({
    overallScore,
    verdict,
    outletCredibility: clampScore(outletCredibility),
    corroboration: clampScore(corroboration),
    recency: clampScore(recency),
    wireConfirmation: clampScore(wireConfirmation),
    rulesPassed: ruleResults.filter((r) => r.passed).length,
    rulesTotal: ruleResults.length,
    primarySourceUrl,
  });
}
