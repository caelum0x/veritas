// Source classifier: infer source type from domain patterns and URL structure.

import { type SourceTier } from "@veritas/core";

export type SourceClass =
  | "ACADEMIC"
  | "GOVERNMENT"
  | "NEWS"
  | "ENCYCLOPEDIA"
  | "SCIENTIFIC_JOURNAL"
  | "SOCIAL_MEDIA"
  | "BLOG"
  | "COMMERCE"
  | "UNKNOWN";

export interface ClassificationResult {
  readonly sourceClass: SourceClass;
  readonly confidence: number;
  readonly signals: readonly string[];
}

const ACADEMIC_TLDS = [".edu", ".ac.uk", ".ac.jp", ".ac.nz", ".ac.za"];
const GOVERNMENT_TLDS = [".gov", ".gov.uk", ".gov.au", ".mil", ".gc.ca"];

const ACADEMIC_DOMAINS = new Set([
  "arxiv.org", "scholar.google.com", "jstor.org", "researchgate.net",
  "academia.edu", "semanticscholar.org", "pubmed.ncbi.nlm.nih.gov",
]);

const JOURNAL_DOMAINS = new Set([
  "nature.com", "science.org", "cell.com", "thelancet.com",
  "bmj.com", "nejm.org", "pnas.org", "plos.org", "springer.com",
  "wiley.com", "elsevier.com", "tandfonline.com", "oup.com",
]);

const ENCYCLOPEDIA_DOMAINS = new Set([
  "wikipedia.org", "britannica.com", "encyclopedia.com", "scholarpedia.org",
]);

const NEWS_DOMAINS = new Set([
  "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk", "nytimes.com",
  "theguardian.com", "washingtonpost.com", "wsj.com", "ft.com",
  "bloomberg.com", "economist.com", "npr.org", "cnn.com", "nbcnews.com",
  "abcnews.go.com", "cbsnews.com", "pbs.org", "politico.com",
]);

const SOCIAL_DOMAINS = new Set([
  "twitter.com", "x.com", "facebook.com", "instagram.com", "tiktok.com",
  "reddit.com", "linkedin.com", "youtube.com", "threads.net", "mastodon.social",
]);

function matchesTld(domain: string, tlds: readonly string[]): boolean {
  return tlds.some((tld) => domain.endsWith(tld));
}

export function classifySource(domain: string, url?: string): ClassificationResult {
  const signals: string[] = [];
  let sourceClass: SourceClass = "UNKNOWN";
  let confidence = 0.5;

  const lowerDomain = domain.toLowerCase();

  if (JOURNAL_DOMAINS.has(lowerDomain)) {
    sourceClass = "SCIENTIFIC_JOURNAL";
    confidence = 0.95;
    signals.push("known_journal_domain");
    return { sourceClass, confidence, signals };
  }

  if (ACADEMIC_DOMAINS.has(lowerDomain)) {
    sourceClass = "ACADEMIC";
    confidence = 0.95;
    signals.push("known_academic_domain");
    return { sourceClass, confidence, signals };
  }

  if (matchesTld(lowerDomain, ACADEMIC_TLDS)) {
    sourceClass = "ACADEMIC";
    confidence = 0.88;
    signals.push("academic_tld");
    return { sourceClass, confidence, signals };
  }

  if (matchesTld(lowerDomain, GOVERNMENT_TLDS)) {
    sourceClass = "GOVERNMENT";
    confidence = 0.92;
    signals.push("government_tld");
    return { sourceClass, confidence, signals };
  }

  if (ENCYCLOPEDIA_DOMAINS.has(lowerDomain)) {
    sourceClass = "ENCYCLOPEDIA";
    confidence = 0.97;
    signals.push("known_encyclopedia_domain");
    return { sourceClass, confidence, signals };
  }

  if (NEWS_DOMAINS.has(lowerDomain)) {
    sourceClass = "NEWS";
    confidence = 0.92;
    signals.push("known_news_domain");
    return { sourceClass, confidence, signals };
  }

  if (SOCIAL_DOMAINS.has(lowerDomain)) {
    sourceClass = "SOCIAL_MEDIA";
    confidence = 0.97;
    signals.push("known_social_domain");
    return { sourceClass, confidence, signals };
  }

  // Heuristic: path-based signals
  if (url) {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes("/blog/") || lowerUrl.includes("/post/") || lowerUrl.includes("/article/")) {
      signals.push("blog_path_pattern");
      if (sourceClass === "UNKNOWN") {
        sourceClass = "BLOG";
        confidence = 0.6;
      }
    }
    if (lowerUrl.includes("/shop/") || lowerUrl.includes("/product/") || lowerUrl.includes("/buy/")) {
      signals.push("commerce_path_pattern");
      sourceClass = "COMMERCE";
      confidence = 0.65;
    }
  }

  if (lowerDomain.includes("blog.") || lowerDomain.startsWith("blog")) {
    signals.push("blog_subdomain");
    if (sourceClass === "UNKNOWN") {
      sourceClass = "BLOG";
      confidence = 0.7;
    }
  }

  if (signals.length === 0) {
    signals.push("no_signals_matched");
  }

  return { sourceClass, confidence, signals };
}

export function sourceClassToTier(cls: SourceClass): SourceTier {
  switch (cls) {
    case "GOVERNMENT":
    case "SCIENTIFIC_JOURNAL":
      return "PRIMARY";
    case "ACADEMIC":
    case "ENCYCLOPEDIA":
    case "NEWS":
      return "SECONDARY";
    case "BLOG":
    case "SOCIAL_MEDIA":
    case "COMMERCE":
      return "TERTIARY";
    default:
      return "UNKNOWN";
  }
}
