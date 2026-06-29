// News heuristic rules: validate news claims against outlet, corroboration, and recency data.
import { asScore, clampScore, type Verdict } from "@veritas/core";
import type {
  OutletRecord,
  NewsArticle,
  WireReport,
  ParsedNewsClaim,
  NewsRuleResult,
} from "./types.js";

/** Map outlet tier to a credibility base score. */
const TIER_SCORE: Record<string, number> = {
  tier1: 1.0,
  tier2: 0.7,
  tier3: 0.45,
  unknown: 0.25,
};

function verdictFromScore(score: number): Verdict {
  if (score >= 0.75) return "SUPPORTED";
  if (score >= 0.5) return "UNVERIFIABLE";
  if (score >= 0.3) return "UNVERIFIABLE";
  return "REFUTED";
}

/** Rule: outlet referenced in claim is registered and credible. */
export function checkOutletCredibility(
  claim: ParsedNewsClaim,
  outlets: ReadonlyArray<OutletRecord>,
): NewsRuleResult {
  if (claim.mentionedOutlets.length === 0) {
    return {
      ruleId: "outlet-credibility",
      passed: false,
      score: asScore(0.3),
      verdict: "UNVERIFIABLE",
      rationale: "No news outlet referenced in claim; cannot assess credibility.",
    };
  }

  const matched = outlets.filter((o) =>
    claim.mentionedOutlets.some((name) => name.toLowerCase() === o.name.toLowerCase()),
  );

  if (matched.length === 0) {
    return {
      ruleId: "outlet-credibility",
      passed: false,
      score: asScore(0.25),
      verdict: "UNVERIFIABLE",
      rationale: `Outlet(s) "${claim.mentionedOutlets.join(", ")}" not found in registry.`,
    };
  }

  const satire = matched.some((o) => o.isSatire);
  if (satire) {
    return {
      ruleId: "outlet-credibility",
      passed: false,
      score: asScore(0.0),
      verdict: "REFUTED",
      rationale: `Outlet "${matched.find((o) => o.isSatire)?.name}" is classified as satire.`,
      details: { satireOutlets: matched.filter((o) => o.isSatire).map((o) => o.name) },
    };
  }

  const scores = matched.map((o) => TIER_SCORE[o.tier] ?? 0.25);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const passed = avg >= 0.5;

  return {
    ruleId: "outlet-credibility",
    passed,
    score: asScore(avg),
    verdict: verdictFromScore(avg),
    rationale: `Outlet credibility score: ${(avg * 100).toFixed(0)}% based on ${matched.length} matched outlet(s).`,
    details: { matchedOutlets: matched.map((o) => ({ name: o.name, tier: o.tier })) },
  };
}

/** Rule: multiple independent outlets report the same claim. */
export function checkCorroboration(
  articles: ReadonlyArray<NewsArticle>,
): NewsRuleResult {
  const uniqueOutlets = new Set(articles.map((a) => a.outletName));
  const count = uniqueOutlets.size;
  const contradicting = articles.filter((a) => a.isOpinion).length;

  const score = clampScore(Math.min(1, 0.2 + count * 0.2) - contradicting * 0.05);
  const passed = count >= 2;

  return {
    ruleId: "corroboration",
    passed,
    score: asScore(score),
    verdict: verdictFromScore(score),
    rationale: passed
      ? `${count} independent outlet(s) report the claim.`
      : `Only ${count} outlet(s) found; insufficient corroboration.`,
    details: { outletCount: count, articles: articles.length, contradicting },
  };
}

/** Rule: wire service (AP, Reuters, AFP) has confirmed the claim. */
export function checkWireConfirmation(
  wires: ReadonlyArray<WireReport>,
): NewsRuleResult {
  if (wires.length === 0) {
    return {
      ruleId: "wire-confirmation",
      passed: false,
      score: asScore(0.3),
      verdict: "UNVERIFIABLE",
      rationale: "No wire service dispatches found for this claim.",
    };
  }

  const topTier = wires.filter((w) => ["ap", "reuters", "afp"].includes(w.wireService));
  const score = clampScore(0.6 + topTier.length * 0.15);
  const passed = wires.length > 0;

  return {
    ruleId: "wire-confirmation",
    passed,
    score: asScore(score),
    verdict: score >= 0.75 ? "SUPPORTED" : "UNVERIFIABLE",
    rationale: `${wires.length} wire dispatch(es) found; ${topTier.length} from top-tier services (AP/Reuters/AFP).`,
    details: {
      total: wires.length,
      topTier: topTier.length,
      services: wires.map((w) => w.wireService),
    },
  };
}

/** Rule: claim is temporally current (article published within acceptable window). */
export function checkRecency(
  articles: ReadonlyArray<NewsArticle>,
  claimEventDate: string | undefined,
): NewsRuleResult {
  if (articles.length === 0) {
    return {
      ruleId: "recency",
      passed: false,
      score: asScore(0.2),
      verdict: "UNVERIFIABLE",
      rationale: "No articles available to assess recency.",
    };
  }

  const now = Date.now();
  const publishedTimes = articles.map((a) => new Date(a.publishedAt).getTime()).filter(Boolean);
  const newestMs = Math.max(...publishedTimes);
  const oldestMs = Math.min(...publishedTimes);
  const newestAgeDays = (now - newestMs) / (1000 * 60 * 60 * 24);

  let score: number;
  if (newestAgeDays <= 1) score = 1.0;
  else if (newestAgeDays <= 7) score = 0.85;
  else if (newestAgeDays <= 30) score = 0.65;
  else if (newestAgeDays <= 365) score = 0.45;
  else score = 0.2;

  // If a claim event date was provided, check alignment.
  if (claimEventDate) {
    const eventMs = new Date(claimEventDate).getTime();
    const coverageAligned = publishedTimes.some((t) => Math.abs(t - eventMs) < 1000 * 60 * 60 * 72);
    if (!coverageAligned) score = Math.max(0, score - 0.2);
  }

  const passed = score >= 0.5;

  return {
    ruleId: "recency",
    passed,
    score: asScore(score),
    verdict: verdictFromScore(score),
    rationale: `Newest article is ${newestAgeDays.toFixed(1)} day(s) old. Recency score: ${(score * 100).toFixed(0)}%.`,
    details: {
      newestAgeDays: Math.round(newestAgeDays * 10) / 10,
      oldestMs,
      newestMs,
      articleCount: articles.length,
    },
  };
}

/** Run all applicable news rules and return an immutable list of results. */
export function applyNewsRules(
  claim: ParsedNewsClaim,
  outlets: ReadonlyArray<OutletRecord>,
  articles: ReadonlyArray<NewsArticle>,
  wires: ReadonlyArray<WireReport>,
): ReadonlyArray<NewsRuleResult> {
  const results: NewsRuleResult[] = [
    checkOutletCredibility(claim, outlets),
    checkCorroboration(articles),
    checkWireConfirmation(wires),
    checkRecency(articles, claim.eventDate),
  ];

  if (results.every((r) => !r.passed)) {
    results.push({
      ruleId: "no-evidence",
      passed: false,
      score: asScore(0.1),
      verdict: "UNVERIFIABLE",
      rationale: "No supporting news evidence found for this claim.",
    });
  }

  return Object.freeze(results);
}
