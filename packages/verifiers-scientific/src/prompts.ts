// Scientific-specific LLM prompts for claim analysis and evidence adjudication.

import type { VerifiableClaim } from "@veritas/verifier-kit";
import type { ScientificEvidenceResult } from "./evidence.js";

/** System prompt for the scientific verifier LLM role. */
export const SCIENTIFIC_SYSTEM_PROMPT = `You are a rigorous scientific fact-checker with expertise in research methodology, peer review standards, and evidence evaluation. Your role is to assess scientific claims against the provided literature evidence.

Guidelines:
- Distinguish peer-reviewed publications from preprints and grey literature.
- Consider citation counts as a proxy for scientific acceptance, not ground truth.
- Flag retracted papers as strong evidence against a claim.
- Identify consensus vs. contested findings in the literature.
- Note when claims extrapolate beyond what studies actually show.
- Consider recency: older studies may be superseded by newer evidence.
- Output structured JSON only.`;

/** Build the user prompt for scientific claim adjudication. */
export function buildAdjudicationPrompt(
  claim: VerifiableClaim,
  evidence: ScientificEvidenceResult,
): string {
  const pubmedSummary = evidence.pubmedEvidence
    .slice(0, 5)
    .map(
      (e) =>
        `- PMID ${e.metadata.pmid}: "${e.metadata.title}" in ${e.metadata.journal} ` +
        `(${e.metadata.isRetracted ? "RETRACTED" : "active"}, citations: ${e.metadata.citationCount ?? "unknown"})`,
    )
    .join("\n");

  const crossrefSummary = evidence.crossrefEvidence
    .slice(0, 3)
    .map(
      (e) =>
        `- DOI ${e.metadata.doi}: "${e.metadata.title}" by ${e.metadata.publisher} ` +
        `(cited by: ${e.metadata.citedByCount})`,
    )
    .join("\n");

  const arxivSummary = evidence.arxivEvidence
    .slice(0, 2)
    .map(
      (e) =>
        `- arXiv:${e.metadata.arxivId}: "${e.metadata.title}" (PREPRINT — not peer-reviewed)`,
    )
    .join("\n");

  const retractionSummary = evidence.retractionEvidence
    .map(
      (e) =>
        `- RETRACTION: "${e.metadata.title}" in ${e.metadata.journal}: ${e.metadata.retractionReason}`,
    )
    .join("\n");

  return `Scientific claim to verify:
"${claim.text}"

PubMed Evidence:
${pubmedSummary || "None found."}

Crossref DOI Evidence:
${crossrefSummary || "None found."}

arXiv Preprints:
${arxivSummary || "None found."}

Retraction Notices:
${retractionSummary || "None found."}

Overall evidence relevance score: ${evidence.overallRelevance.toFixed(2)}

Assess this scientific claim and respond with JSON:
{
  "verdict": "SUPPORTED" | "REFUTED" | "UNVERIFIABLE",
  "confidence": <0.0–1.0>,
  "rationale": "<concise explanation referencing specific evidence>",
  "caveats": ["<any methodological concerns or limitations>"],
  "consensusLevel": "strong" | "moderate" | "weak" | "contested" | "insufficient"
}`;
}

/** Build a keyword extraction prompt for claims without explicit identifiers. */
export function buildKeywordExtractionPrompt(claimText: string): string {
  return `Extract the most scientifically relevant search keywords from this claim for querying PubMed and Crossref.

Claim: "${claimText}"

Return JSON only:
{
  "keywords": ["<term1>", "<term2>", ...],
  "meshTerms": ["<MeSH term if applicable>", ...],
  "doi": "<DOI if present in the claim or null>",
  "pmid": "<PubMed ID if present in the claim or null>"
}`;
}

/** Build a consensus assessment prompt from multiple abstracts. */
export function buildConsensusPrompt(
  claimText: string,
  abstracts: ReadonlyArray<{ title: string; abstract: string; journal: string }>,
): string {
  const abstractList = abstracts
    .slice(0, 5)
    .map((a, i) => `[${i + 1}] "${a.title}" (${a.journal})\n${a.abstract.slice(0, 400)}`)
    .join("\n\n");

  return `Assess the scientific consensus on the following claim based on these abstracts:

Claim: "${claimText}"

Abstracts:
${abstractList}

Respond with JSON:
{
  "consensus": "strong_support" | "moderate_support" | "contested" | "moderate_refutation" | "strong_refutation" | "insufficient_evidence",
  "confidence": <0.0–1.0>,
  "supportingCount": <number>,
  "refutingCount": <number>,
  "summary": "<1-2 sentence synthesis>"
}`;
}
