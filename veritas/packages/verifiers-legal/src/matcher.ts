// Legal claim matcher: detect whether a claim concerns legal statutes, case law, or jurisdictions.

import type { VerifiableClaim } from "@veritas/verifier-kit";

/** Keywords that strongly indicate a legal claim. */
const LEGAL_KEYWORDS: ReadonlyArray<string> = [
  "law", "legal", "illegal", "unlawful", "lawful", "statute", "statutory",
  "regulation", "regulatory", "ordinance", "code", "act", "amendment",
  "constitution", "constitutional", "unconstitutional",
  "court", "judge", "ruling", "judgment", "verdict", "decision", "opinion",
  "plaintiff", "defendant", "appeal", "appellate", "precedent", "holding",
  "case", "lawsuit", "litigation", "sue", "sued", "suing",
  "crime", "criminal", "felony", "misdemeanor", "indictment", "conviction",
  "arrest", "warrant", "bail", "parole", "probation", "sentence",
  "contract", "breach", "liability", "tort", "negligence", "damages",
  "civil rights", "due process", "equal protection", "first amendment",
  "fourth amendment", "fifth amendment", "sixth amendment",
  "jurisdiction", "federal", "state law", "common law", "case law",
  "supreme court", "circuit court", "district court", "appellate court",
  "attorney", "lawyer", "counsel", "bar", "pro se",
  "patent", "trademark", "copyright", "intellectual property",
  "mandatory", "prohibited", "permitted", "exemption", "waiver",
];

/** Domain hint values that map to legal. */
const LEGAL_DOMAINS: ReadonlySet<string> = new Set([
  "legal", "law", "statute", "case-law", "regulation", "court", "jurisdiction",
  "criminal", "civil", "constitutional", "contract",
]);

/** Statute citation regex (e.g., "42 U.S.C. § 1983", "Cal. Pen. Code § 187"). */
const STATUTE_CITE_REGEX = /\d+\s+[A-Z][a-zA-Z.]+\s+[§§]\s*\d+/;

/** Case citation regex (e.g., "Brown v. Board", "Miranda v. Arizona"). */
const CASE_CITE_REGEX = /[A-Z][a-zA-Z]+\s+v\.\s+[A-Z][a-zA-Z]+/;

/** Return true if the claim domain hint is legal. */
function hasDomainHint(claim: VerifiableClaim): boolean {
  if (claim.domain == null) return false;
  return LEGAL_DOMAINS.has(claim.domain.toLowerCase());
}

/** Return true if the claim text contains legal keywords. */
function hasLegalKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return LEGAL_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Return true if the claim text contains statute or case citations. */
function hasLegalCitations(text: string): boolean {
  return STATUTE_CITE_REGEX.test(text) || CASE_CITE_REGEX.test(text);
}

/** Extract apparent jurisdiction mentions from claim text. */
export function extractJurisdictions(text: string): ReadonlyArray<string> {
  const jurisdictions: string[] = [];
  const statePattern = /\b(federal|state|California|Texas|New York|Florida|Illinois|Pennsylvania|Ohio|Georgia|Michigan|North Carolina|New Jersey|Virginia|Washington|Arizona|Massachusetts|Tennessee|Indiana|Missouri|Maryland|Wisconsin|Colorado|Minnesota|South Carolina|Alabama|Louisiana|Kentucky|Oregon|Oklahoma|Connecticut|Utah|Iowa|Nevada|Arkansas|Mississippi|Kansas|New Mexico|Nebraska|Idaho|West Virginia|Hawaii|New Hampshire|Maine|Montana|Rhode Island|Delaware|South Dakota|North Dakota|Alaska|Vermont|Wyoming)\b/g;
  let match: RegExpExecArray | null;
  while ((match = statePattern.exec(text)) !== null) {
    if (match[1] != null) jurisdictions.push(match[1]);
  }
  return [...new Set(jurisdictions)];
}

/** Extract case citations from claim text (e.g. "Roe v. Wade"). */
export function extractCaseCitations(text: string): ReadonlyArray<string> {
  const citations: string[] = [];
  const regex = /[A-Z][a-zA-Z]+\s+v\.\s+[A-Z][a-zA-Z]+(?:\s+(?:Inc|Corp|LLC|Co|Ltd)\.?)*/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    citations.push(match[0]);
  }
  return [...new Set(citations)];
}

/**
 * Determine if a claim can be handled by the legal verifier.
 * Uses domain hint, keyword matching, and citation detection.
 */
export function canHandleLegalClaim(claim: VerifiableClaim): boolean {
  if (hasDomainHint(claim)) return true;
  if (hasLegalCitations(claim.text)) return true;
  if (hasLegalKeywords(claim.text)) return true;
  return false;
}

/** Score how strongly a claim appears to be legal [0, 1]. */
export function legalRelevanceScore(claim: VerifiableClaim): number {
  const text = claim.text.toLowerCase();
  const matchCount = LEGAL_KEYWORDS.filter((kw) => text.includes(kw)).length;
  const keywordScore = Math.min(1, matchCount / 5);
  const domainBonus = hasDomainHint(claim) ? 0.3 : 0;
  const citationBonus = hasLegalCitations(claim.text) ? 0.25 : 0;
  return Math.min(1, keywordScore + domainBonus + citationBonus);
}
