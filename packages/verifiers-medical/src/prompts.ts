// Medical-specific LLM prompts: system and user prompt templates for medical claim analysis.

import type { VerifiableClaim } from "@veritas/verifier-kit";

/** System prompt establishing the medical fact-checker persona. */
export const MEDICAL_SYSTEM_PROMPT = `You are a medical fact-verification specialist with expertise in:
- Clinical pharmacology: drug mechanisms, indications, contraindications, adverse effects
- Evidence-based medicine: RCTs, meta-analyses, systematic reviews, cohort studies
- Clinical practice guidelines from AHA, ADA, WHO, NICE, and specialty societies
- Diagnostic criteria: ICD-10/ICD-11 codes, DSM-5, standard diagnostic workup
- Regulatory approvals: FDA, EMA drug approval status and labeling
- Epidemiology: incidence, prevalence, risk factors, mortality rates

Your task is to analyze medical claims against provided evidence and determine their veracity.
Be precise, cite specific studies and guideline references, and flag any discrepancies.

Output a JSON object with:
{
  "verdict": "supported" | "refuted" | "partial" | "unverifiable",
  "confidence": number (0-1),
  "rationale": string,
  "keyFindings": string[],
  "dataGaps": string[],
  "safetyNote": string | null
}

Include a safetyNote if the claim involves patient safety considerations.`;

/** Build a user prompt for medical claim analysis with evidence context. */
export function buildMedicalAnalysisPrompt(
  claim: VerifiableClaim,
  evidenceSummaries: ReadonlyArray<{ label: string; excerpt: string; sourceUri: string }>,
): string {
  const evidenceBlock =
    evidenceSummaries.length > 0
      ? evidenceSummaries
          .map((e, i) => `[${i + 1}] ${e.label}\nSource: ${e.sourceUri}\n${e.excerpt}`)
          .join("\n\n")
      : "No external evidence retrieved.";

  const drugHint = claim.metadata?.["drugNames"] != null
    ? `\nDRUG ENTITIES: ${String(claim.metadata["drugNames"])}`
    : "";

  return `Analyze the following medical claim:

CLAIM: "${claim.text}"${drugHint}

EVIDENCE:
${evidenceBlock}

Based on this evidence, determine whether the claim is supported, refuted, partially supported, or unverifiable.
Return your analysis as the specified JSON object.`;
}

/** Build a prompt to extract drug names and medical entities from a claim. */
export function buildDrugExtractionPrompt(claimText: string): string {
  return `Extract any drug names, disease names, or medical entities from this claim.

CLAIM: "${claimText}"

Return a JSON object:
{
  "drugNames": string[],         // e.g. ["metformin", "atorvastatin"]
  "diseaseNames": string[],      // e.g. ["type 2 diabetes", "hypertension"]
  "medicalProcedures": string[], // e.g. ["PCI", "coronary artery bypass"]
  "measuredOutcomes": string[]   // e.g. ["HbA1c reduction", "mortality"]
}

If no entities found, return empty arrays.`;
}

/** Build a stance-assessment prompt for a single evidence item vs a medical claim. */
export function buildMedicalStancePrompt(claimText: string, evidenceExcerpt: string): string {
  return `Does the following medical evidence support or refute this claim?

CLAIM: "${claimText}"

EVIDENCE: "${evidenceExcerpt}"

Consider: Does the evidence corroborate the specific assertion made in the claim?
Return one of: "supports" | "refutes" | "neutral" | "inconclusive"
Respond with only the stance word.`;
}

/** Build a prompt to assess evidence quality and grade for a medical study excerpt. */
export function buildEvidenceGradePrompt(studyExcerpt: string): string {
  return `Assess the evidence quality of the following medical study excerpt.

STUDY EXCERPT: "${studyExcerpt}"

Classify the study type and assign an evidence grade:
{
  "studyType": "RCT" | "meta-analysis" | "systematic-review" | "cohort" | "case-control" | "case-report" | "expert-opinion" | "unknown",
  "gradeLevel": "I" | "II" | "III" | "IV" | "V",
  "rationale": string
}

Grade I = systematic review/meta-analysis of RCTs; Grade V = expert opinion/case reports.
Return only the JSON object.`;
}
