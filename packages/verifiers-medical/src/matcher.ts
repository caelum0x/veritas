// Medical claim matcher: detect whether a claim concerns medical, drug, or clinical data.

import type { VerifiableClaim } from "@veritas/verifier-kit";

/** Keywords indicating a claim involves medical or clinical content. */
const MEDICAL_KEYWORDS: ReadonlyArray<string> = [
  "drug", "medication", "medicine", "pharmaceutical", "treatment", "therapy",
  "clinical trial", "placebo", "efficacy", "side effect", "adverse event",
  "dose", "dosage", "contraindication", "indication", "fda approved", "fda",
  "disease", "diagnosis", "symptom", "condition", "syndrome", "disorder",
  "cancer", "diabetes", "hypertension", "covid", "vaccine", "immunization",
  "antibiotic", "antiviral", "antifungal", "chemotherapy", "radiation",
  "surgery", "procedure", "intervention", "patient", "mortality", "morbidity",
  "randomized controlled trial", "rct", "meta-analysis", "systematic review",
  "pubmed", "nejm", "lancet", "jama", "bmj", "clinical study",
  "blood pressure", "cholesterol", "glucose", "insulin", "hormone",
  "gene therapy", "stem cell", "biomarker", "pathogen", "virus", "bacteria",
  "icd", "icd-10", "icd-11", "diagnostic criteria", "prognosis",
];

/** Domain hint values that map to medical. */
const MEDICAL_DOMAINS: ReadonlySet<string> = new Set([
  "medical", "medicine", "clinical", "health", "healthcare", "drug",
  "pharmaceutical", "pubmed", "fda", "clinical-trial", "epidemiology",
]);

/** Drug name pattern: common suffix patterns for pharmaceutical compounds. */
const DRUG_SUFFIX_REGEX = /\b\w+(?:mab|nib|zumab|tinib|ciclib|parin|statin|cillin|mycin|oxacin|olol|pril|sartan|vir|navir)\b/i;

/** Return true if the claim domain hint is medical. */
function hasDomainHint(claim: VerifiableClaim): boolean {
  if (claim.domain == null) return false;
  return MEDICAL_DOMAINS.has(claim.domain.toLowerCase());
}

/** Return true if the claim text contains medical keywords. */
function hasMedicalKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return MEDICAL_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Return true if the claim text appears to reference drug compound names. */
function hasDrugNames(text: string): boolean {
  return DRUG_SUFFIX_REGEX.test(text);
}

/**
 * Determine if a claim can be handled by the medical verifier.
 * Uses domain hint, keyword matching, and drug name detection.
 */
export function canHandleMedicalClaim(claim: VerifiableClaim): boolean {
  if (hasDomainHint(claim)) return true;
  if (hasMedicalKeywords(claim.text)) return true;
  if (hasDrugNames(claim.text)) return true;
  return false;
}

/** Extract drug or compound names from a claim text using suffix heuristics. */
export function extractDrugNames(text: string): ReadonlyArray<string> {
  const regex = /\b(\w+(?:mab|nib|zumab|tinib|ciclib|parin|statin|cillin|mycin|oxacin|olol|pril|sartan|vir|navir))\b/gi;
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[1] != null) results.push(match[1].toLowerCase());
  }
  return [...new Set(results)];
}

/** Score how strongly a claim appears to be medical [0, 1]. */
export function medicalRelevanceScore(claim: VerifiableClaim): number {
  const text = claim.text.toLowerCase();
  const matchCount = MEDICAL_KEYWORDS.filter((kw) => text.includes(kw)).length;
  const keywordScore = Math.min(1, matchCount / 5);
  const domainBonus = hasDomainHint(claim) ? 0.3 : 0;
  const drugBonus = hasDrugNames(claim.text) ? 0.2 : 0;
  return Math.min(1, keywordScore + domainBonus + drugBonus);
}
