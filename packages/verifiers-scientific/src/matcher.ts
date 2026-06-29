// Scientific claim matcher: detects whether a claim falls in the scientific domain.

/** Minimal claim shape required for domain detection. */
interface DetectableClaim {
  readonly text: string;
  readonly domain?: string;
}

/** Keywords and patterns that indicate a scientific claim. */
const SCIENTIFIC_KEYWORDS = [
  "study",
  "research",
  "trial",
  "experiment",
  "clinical",
  "peer-reviewed",
  "meta-analysis",
  "systematic review",
  "randomized",
  "controlled",
  "published in",
  "journal",
  "pubmed",
  "doi",
  "arxiv",
  "pmid",
  "hypothesis",
  "statistically significant",
  "p-value",
  "confidence interval",
  "sample size",
  "cohort",
  "placebo",
  "double-blind",
  "efficacy",
  "biomarker",
  "genome",
  "protein",
  "cell",
  "molecule",
  "pathogen",
  "vaccine",
  "drug",
  "treatment",
  "therapy",
  "diagnosis",
  "epidemiology",
  "algorithm",
  "model predicts",
  "data shows",
  "findings suggest",
  "evidence indicates",
];

/** DOI regex pattern. */
const DOI_PATTERN = /\b10\.\d{4,}\/\S+/i;

/** PubMed ID pattern. */
const PMID_PATTERN = /\bpmid[:\s]+\d+/i;

/** arXiv ID pattern. */
const ARXIV_PATTERN = /\barxiv[:\s]+\d{4}\.\d{4,}/i;

/**
 * Returns true when the claim text contains scientific vocabulary or identifiers.
 * Cheap synchronous heuristic — no network calls.
 */
export function isScientificClaim(claim: DetectableClaim): boolean {
  if (claim.domain === "scientific") return true;
  if (claim.domain != null && claim.domain !== "general") return false;

  const text = claim.text.toLowerCase();

  if (DOI_PATTERN.test(claim.text)) return true;
  if (PMID_PATTERN.test(claim.text)) return true;
  if (ARXIV_PATTERN.test(claim.text)) return true;

  const matchCount = SCIENTIFIC_KEYWORDS.filter((kw) => text.includes(kw)).length;
  return matchCount >= 2;
}

/** Extract a DOI from claim text, or return null. */
export function extractDoi(text: string): string | null {
  const match = text.match(DOI_PATTERN);
  return match != null ? match[0] : null;
}

/** Extract a PubMed ID from claim text, or return null. */
export function extractPmid(text: string): string | null {
  const match = text.match(/\bpmid[:\s]+(\d+)/i);
  return match != null ? (match[1] ?? null) : null;
}

/** Extract an arXiv ID from claim text, or return null. */
export function extractArxivId(text: string): string | null {
  const match = text.match(/\barxiv[:\s]+(\d{4}\.\d{4,})/i);
  return match != null ? (match[1] ?? null) : null;
}

/** Extract meaningful search keywords from a scientific claim text. */
export function extractSearchKeywords(text: string): readonly string[] {
  const stopWords = new Set([
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "to", "of", "in", "on",
    "at", "by", "for", "with", "about", "from", "that", "this", "it",
    "its", "and", "or", "but", "not", "no", "nor", "so", "yet",
  ]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w))
    .slice(0, 8);
}
