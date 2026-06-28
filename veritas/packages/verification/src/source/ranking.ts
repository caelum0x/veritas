// Rank citation sources by authority: tier, domain trust, and snippet quality.

import type { ReportCitation } from "@veritas/contracts";
import { hostOf } from "@veritas/core";

/** Source tier levels from highest to lowest authority. */
type AuthorityTier = "academic" | "government" | "established" | "news" | "general" | "unknown";

/** Known high-authority domain patterns mapped to their tier. */
const TIER_PATTERNS: ReadonlyArray<{ pattern: RegExp; tier: AuthorityTier }> = [
  { pattern: /\.edu$/, tier: "academic" },
  { pattern: /\.gov$/, tier: "government" },
  { pattern: /\.gov\.\w{2}$/, tier: "government" },
  { pattern: /^scholar\.google\.com$/, tier: "academic" },
  { pattern: /^pubmed\.ncbi\.nlm\.nih\.gov$/, tier: "academic" },
  { pattern: /^arxiv\.org$/, tier: "academic" },
  { pattern: /^reuters\.com$|^apnews\.com$|^bbc\.com$|^bbc\.co\.uk$/, tier: "news" },
  { pattern: /^nytimes\.com$|^washingtonpost\.com$|^theguardian\.com$/, tier: "news" },
  {
    pattern: /^wikipedia\.org$|^britannica\.com$|^merriam-webster\.com$/,
    tier: "established",
  },
  { pattern: /^nature\.com$|^science\.org$|^thelancet\.com$/, tier: "academic" },
];

/** Numeric score for each tier — higher is more authoritative. */
const TIER_SCORES: Record<AuthorityTier, number> = {
  academic: 100,
  government: 90,
  established: 70,
  news: 60,
  general: 30,
  unknown: 10,
};

/** Determine the authority tier for a given hostname. */
function classifyHost(host: string): AuthorityTier {
  for (const { pattern, tier } of TIER_PATTERNS) {
    if (pattern.test(host)) return tier;
  }
  return host.length > 0 ? "general" : "unknown";
}

/** Compute an authority score for a single citation (0–100 scale). */
function authorityScore(citation: ReportCitation): number {
  const host = hostOf(citation.url) ?? "";
  const tier = classifyHost(host);
  let score = TIER_SCORES[tier];

  // Bonus for having a title (indicates a real, indexable page).
  if (citation.title != null && citation.title.trim().length > 0) {
    score += 5;
  }

  // Bonus for having a quote snippet (direct evidence).
  if (citation.quote != null && citation.quote.trim().length > 10) {
    score += 10;
  }

  // Supporting citations score higher than contradicting ones within authority ranking.
  if (!citation.supports) {
    score -= 5;
  }

  return Math.max(0, Math.min(120, score));
}

/**
 * Rank an array of citations from highest to lowest authority.
 * Returns a new array leaving the input unchanged.
 */
export function rankSources(citations: ReadonlyArray<ReportCitation>): ReportCitation[] {
  return [...citations].sort((a, b) => authorityScore(b) - authorityScore(a));
}

/** Return only the top N citations by authority score. */
export function topSources(
  citations: ReadonlyArray<ReportCitation>,
  limit: number,
): ReportCitation[] {
  return rankSources(citations).slice(0, limit);
}
