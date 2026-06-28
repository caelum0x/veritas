// News claim matcher: detect whether a claim concerns news events or media reporting.

import type { VerifiableClaim } from "@veritas/verifier-kit";

/** Keywords that signal a claim involves news or current events. */
const NEWS_KEYWORDS: ReadonlyArray<string> = [
  "reported", "announced", "said", "stated", "claims", "according to",
  "news", "article", "press release", "interview", "statement", "spokesperson",
  "published", "broadcast", "headline", "story", "journalist", "reporter",
  "editorial", "op-ed", "column", "exclusive", "breaking", "latest",
  "confirmed", "denied", "alleged", "sources say", "officials say",
  "government", "administration", "president", "minister", "senator",
  "election", "vote", "policy", "legislation", "law", "bill", "treaty",
  "war", "conflict", "attack", "protest", "demonstration", "summit",
  "crisis", "disaster", "incident", "event", "happened", "occurred",
  "outbreak", "pandemic", "epidemic", "death toll", "casualties",
  "ap", "reuters", "bbc", "cnn", "nyt", "new york times", "washington post",
  "associated press", "afp", "bloomberg news",
];

/** News-specific domain hint values. */
const NEWS_DOMAINS: ReadonlySet<string> = new Set([
  "news", "media", "journalism", "current-events", "politics", "world",
  "breaking", "wire", "press", "outlet",
]);

/** Return true if the claim domain hint is news-related. */
function hasDomainHint(claim: VerifiableClaim): boolean {
  if (claim.domain == null) return false;
  return NEWS_DOMAINS.has(claim.domain.toLowerCase());
}

/** Return true if claim text contains news-relevant keywords. */
function hasNewsKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return NEWS_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Return true if the claim references a known news outlet by name. */
function hasOutletReference(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(reuters|associated press|bbc|cnn|nbc|abc|cbs|fox news|npr|guardian|times|post|tribune|journal)\b/.test(lower);
}

/**
 * Determine if a claim can be handled by the news verifier.
 * Uses domain hint, keyword matching, and outlet detection.
 */
export function canHandleNewsClaim(claim: VerifiableClaim): boolean {
  if (hasDomainHint(claim)) return true;
  if (hasNewsKeywords(claim.text)) return true;
  if (hasOutletReference(claim.text)) return true;
  return false;
}

/** Extract outlet names mentioned in a claim. */
export function extractOutlets(text: string): ReadonlyArray<string> {
  const OUTLETS = [
    "Reuters", "Associated Press", "BBC", "CNN", "NBC", "ABC", "CBS",
    "Fox News", "NPR", "The Guardian", "New York Times", "Washington Post",
    "Wall Street Journal", "Bloomberg", "AP", "AFP",
  ];
  const lower = text.toLowerCase();
  return OUTLETS.filter((o) => lower.includes(o.toLowerCase()));
}

/** Extract quoted phrases that may be attributions from the claim text. */
export function extractAttributions(text: string): ReadonlyArray<string> {
  const quoted: string[] = [];
  const regex = /"([^"]{5,200})"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[1] != null) quoted.push(match[1]);
  }
  return quoted;
}

/** Score how strongly a claim appears to be news-related [0, 1]. */
export function newsRelevanceScore(claim: VerifiableClaim): number {
  const text = claim.text.toLowerCase();
  const matchCount = NEWS_KEYWORDS.filter((kw) => text.includes(kw)).length;
  const keywordScore = Math.min(1, matchCount / 5);
  const domainBonus = hasDomainHint(claim) ? 0.3 : 0;
  const outletBonus = hasOutletReference(claim.text) ? 0.2 : 0;
  return Math.min(1, keywordScore + domainBonus + outletBonus);
}
