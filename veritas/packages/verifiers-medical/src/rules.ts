// Medical heuristic rules: domain detection patterns and claim validation logic.
import type { MedicalClaimDomain, MedicalClaimFacts } from "./types.js";

/** Keyword sets keyed by medical sub-domain for fast classification. */
const DOMAIN_KEYWORDS: Readonly<Record<MedicalClaimDomain, readonly string[]>> = {
  drug_efficacy: ["effective", "efficacy", "works", "treats", "cures", "reduces", "improves", "benefit"],
  drug_safety: ["safe", "side effect", "adverse", "toxicity", "contraindicated", "risk", "harm", "warning"],
  diagnosis: ["diagnosed", "diagnosis", "symptom", "sign", "presents with", "icd", "disease", "disorder"],
  treatment_guideline: ["guideline", "recommendation", "standard of care", "first-line", "protocol", "should be treated"],
  clinical_trial: ["clinical trial", "randomized", "rct", "placebo", "double-blind", "phase", "cohort study"],
  epidemiology: ["prevalence", "incidence", "mortality", "morbidity", "population", "epidemiology", "rate"],
  medical_device: ["device", "implant", "prosthetic", "pacemaker", "stent", "catheter", "fda cleared"],
  general_medical: ["medical", "health", "patient", "hospital", "physician", "doctor", "nurse"],
};

/** Drug name signals — generic stems and known drug endings. */
const DRUG_STEM_PATTERNS = [
  /\b\w+mab\b/i,   // monoclonal antibodies
  /\b\w+nib\b/i,   // kinase inhibitors
  /\b\w+pril\b/i,  // ACE inhibitors
  /\b\w+statin\b/i, // statins
  /\b\w+olol\b/i,  // beta-blockers
  /\b\w+pam\b/i,   // benzodiazepines
  /\b\w+mycin\b/i, // antibiotics
  /\b\w+cillin\b/i, // penicillins
  /\b\w+cycline\b/i, // tetracyclines
  /\b\w+oxacin\b/i, // fluoroquinolones
];

/** Detect whether a text contains medical claim signals. */
export function isMedicalClaim(text: string): boolean {
  const lower = text.toLowerCase();
  const allKeywords = Object.values(DOMAIN_KEYWORDS).flat();
  const hasKeyword = allKeywords.some((kw) => lower.includes(kw));
  const hasDrugStem = DRUG_STEM_PATTERNS.some((re) => re.test(text));
  return hasKeyword || hasDrugStem;
}

/** Classify the primary sub-domain of a medical claim (returns first match by priority). */
export function classifyMedicalDomain(text: string): MedicalClaimDomain {
  const lower = text.toLowerCase();
  const priority: MedicalClaimDomain[] = [
    "clinical_trial",
    "treatment_guideline",
    "drug_safety",
    "drug_efficacy",
    "diagnosis",
    "epidemiology",
    "medical_device",
    "general_medical",
  ];
  for (const domain of priority) {
    if (DOMAIN_KEYWORDS[domain].some((kw) => lower.includes(kw))) {
      return domain;
    }
  }
  return "general_medical";
}

/** Extract drug names from claim text using stem heuristics. */
function extractDrugNames(text: string): string[] {
  const found: string[] = [];
  for (const pattern of DRUG_STEM_PATTERNS) {
    const matches = text.match(new RegExp(pattern.source, "gi"));
    if (matches) found.push(...matches.map((m) => m.toLowerCase()));
  }
  return [...new Set(found)];
}

/** Extract condition/diagnosis references using simple bracket/colon patterns. */
function extractConditions(text: string): string[] {
  const conditions: string[] = [];
  const knownTerms = [
    "diabetes", "hypertension", "cancer", "asthma", "copd", "arthritis",
    "depression", "anxiety", "alzheimer", "parkinson", "hiv", "covid",
    "pneumonia", "stroke", "heart failure", "myocardial infarction",
  ];
  const lower = text.toLowerCase();
  for (const term of knownTerms) {
    if (lower.includes(term)) conditions.push(term);
  }
  return conditions;
}

/** Extract statistical claims (percentages, risk ratios, p-values). */
function extractStatisticalClaims(text: string): string[] {
  const patterns = [
    /\d+(?:\.\d+)?%/g,
    /p\s*[<=>]\s*0\.\d+/gi,
    /(?:odds ratio|or|relative risk|rr|hazard ratio|hr)\s*[=:]\s*\d+(?:\.\d+)?/gi,
    /(?:number needed to treat|nnt)\s*[=:]\s*\d+/gi,
  ];
  const found: string[] = [];
  for (const re of patterns) {
    const matches = text.match(re);
    if (matches) found.push(...matches);
  }
  return [...new Set(found)];
}

/** Extract authority references (FDA, WHO, CDC, etc.). */
function extractAuthorityReferences(text: string): string[] {
  const authorities = ["FDA", "WHO", "CDC", "NIH", "EMA", "NICE", "AHA", "ACC", "ADA", "ACS"];
  return authorities.filter((auth) => text.toUpperCase().includes(auth));
}

/** Build a full MedicalClaimFacts structure from raw claim text. */
export function extractMedicalClaimFacts(text: string): MedicalClaimFacts {
  return {
    domain: classifyMedicalDomain(text),
    drugNames: extractDrugNames(text),
    conditionNames: extractConditions(text),
    treatmentNames: [],
    statisticalClaims: extractStatisticalClaims(text),
    authorityReferences: extractAuthorityReferences(text),
  };
}

/** Check whether a claim makes any quantitative statistical assertion. */
export function hasStatisticalAssertion(text: string): boolean {
  return extractStatisticalClaims(text).length > 0;
}

/** Check whether a claim references a known drug. */
export function referencesDrug(text: string): boolean {
  return extractDrugNames(text).length > 0;
}
