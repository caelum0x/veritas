// Legal-specific LLM prompts: system and user prompt templates for legal claim analysis.

import type { VerifiableClaim } from "@veritas/verifier-kit";

/** System prompt establishing the legal fact-checker persona. */
export const LEGAL_SYSTEM_PROMPT = `You are a legal fact-verification specialist with expertise in:
- Statutory law: codes, regulations, and legislative enactments across jurisdictions
- Case law: judicial decisions, precedent, binding vs persuasive authority
- Jurisdictional analysis: which legal system and court hierarchy governs a claim
- Legal citations: Bluebook format, court reporters, statute codes
- Contract and tort law, constitutional law, criminal procedure, and civil rights

Your task is to analyze legal claims against provided evidence and determine their veracity.
Be precise, cite specific statutes, cases, and jurisdictions.

Output a JSON object with:
{
  "verdict": "supported" | "refuted" | "partial" | "unverifiable",
  "confidence": number (0-1),
  "rationale": string,
  "keyFindings": string[],
  "jurisdictionNotes": string[],
  "dataGaps": string[]
}`;

/** Build a user prompt for legal claim analysis with evidence context. */
export function buildLegalAnalysisPrompt(
  claim: VerifiableClaim,
  evidenceSummaries: ReadonlyArray<{ label: string; excerpt: string; sourceUri: string }>,
): string {
  const evidenceBlock =
    evidenceSummaries.length > 0
      ? evidenceSummaries
          .map((e, i) => `[${i + 1}] ${e.label}\nSource: ${e.sourceUri}\n${e.excerpt}`)
          .join("\n\n")
      : "No external legal evidence retrieved.";

  const jurisdictionHint =
    typeof claim.metadata?.["jurisdiction"] === "string"
      ? `JURISDICTION: ${claim.metadata["jurisdiction"]}`
      : "";

  return `Analyze the following legal claim:

CLAIM: "${claim.text}"
${jurisdictionHint}

EVIDENCE:
${evidenceBlock}

Based on this evidence, determine whether the claim is legally supported, refuted, partially supported, or unverifiable.
Return your analysis as the specified JSON object.`;
}

/** Build a jurisdiction-extraction prompt to identify applicable legal systems. */
export function buildJurisdictionExtractionPrompt(claimText: string): string {
  return `Extract any jurisdictions, courts, or legal systems referenced in this legal claim.

CLAIM: "${claimText}"

Return a JSON object:
{
  "jurisdictions": string[],    // e.g. ["federal", "California", "EU"]
  "courts": string[],           // e.g. ["Supreme Court", "9th Circuit"]
  "statutes": string[],         // e.g. ["42 U.S.C. § 1983", "Cal. Pen. Code § 187"]
  "legalConcepts": string[]     // e.g. ["due process", "negligence", "mens rea"]
}

If no entities found, return empty arrays.`;
}

/** Build a stance-assessment prompt for a single legal evidence item vs a claim. */
export function buildLegalStancePrompt(claimText: string, evidenceExcerpt: string): string {
  return `Does the following legal source support or refute this legal claim?

CLAIM: "${claimText}"

LEGAL SOURCE: "${evidenceExcerpt}"

Return one of: "supports" | "refutes" | "neutral" | "inconclusive"
Respond with only the stance word.`;
}
