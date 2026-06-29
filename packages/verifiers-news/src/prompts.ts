// News-specific LLM prompts: system and user prompt templates for news claim analysis.

import type { VerifiableClaim } from "@veritas/verifier-kit";

/** System prompt establishing the news fact-checker persona. */
export const NEWS_SYSTEM_PROMPT = `You are a news fact-verification specialist with expertise in:
- Evaluating source credibility and journalistic standards across tier-1, tier-2, and tier-3 outlets
- Cross-referencing claims against wire services (AP, Reuters, AFP, Bloomberg)
- Identifying satire, opinion, and editorializing masquerading as news
- Detecting misinformation patterns: false attribution, context removal, fabricated quotes
- Assessing recency and whether historical events are being misrepresented as current
- Distinguishing between what was "reported" vs what is factually established

Your task is to analyze news claims against provided evidence and determine their veracity.
Be precise about attribution—who said what and in what context.
Flag satire, opinion, and unverified claims explicitly.

Output a JSON object with:
{
  "verdict": "supported" | "refuted" | "partial" | "unverifiable",
  "confidence": number (0-1),
  "rationale": string,
  "keyFindings": string[],
  "attributionIssues": string[],
  "dataGaps": string[]
}`;

/** Build a user prompt for news claim analysis with evidence context. */
export function buildNewsAnalysisPrompt(
  claim: VerifiableClaim,
  evidenceSummaries: ReadonlyArray<{ label: string; excerpt: string; sourceUri: string }>,
): string {
  const evidenceBlock =
    evidenceSummaries.length > 0
      ? evidenceSummaries
          .map((e, i) => `[${i + 1}] ${e.label}\nSource: ${e.sourceUri}\n${e.excerpt}`)
          .join("\n\n")
      : "No external evidence retrieved.";

  return `Analyze the following news claim:

CLAIM: "${claim.text}"
${claim.metadata?.outlets ? `MENTIONED OUTLETS: ${String(claim.metadata.outlets)}` : ""}
${claim.metadata?.claimDate ? `CLAIM DATE: ${String(claim.metadata.claimDate)}` : ""}

EVIDENCE:
${evidenceBlock}

Determine whether the claim is supported, refuted, partially supported, or unverifiable.
Pay special attention to:
1. Whether the claim correctly attributes quotes or statements
2. Whether the claim accurately represents what was reported
3. Whether the claim is current or misrepresents historical context
4. Whether corroborating wire service or tier-1 outlet coverage exists

Return your analysis as the specified JSON object.`;
}

/** Build an outlet-extraction prompt to identify news sources cited in a claim. */
export function buildOutletExtractionPrompt(claimText: string): string {
  return `Extract any news outlets, publications, or media organizations referenced in this claim.

CLAIM: "${claimText}"

Return a JSON object:
{
  "outlets": string[],       // e.g. ["Reuters", "BBC", "New York Times"]
  "journalists": string[],   // e.g. ["Jane Smith", "John Doe"]
  "attributedParties": string[] // people or orgs quoted or cited in the claim
}

If no entities found, return empty arrays.`;
}

/** Build a stance-assessment prompt for a single news article vs a claim. */
export function buildNewsStancePrompt(claimText: string, evidenceExcerpt: string): string {
  return `Does the following news excerpt support or refute this claim?

CLAIM: "${claimText}"

EXCERPT: "${evidenceExcerpt}"

Consider:
- Whether the excerpt directly addresses the claim's core assertion
- Whether quotes are accurately attributed
- Whether context has been preserved or distorted

Return one of: "supports" | "refutes" | "neutral" | "inconclusive"
Respond with only the stance word.`;
}

/** Build a satire/credibility check prompt for a suspicious source. */
export function buildCredibilityCheckPrompt(outletName: string, articleExcerpt: string): string {
  return `Assess the credibility of this news source and article.

OUTLET: "${outletName}"
EXCERPT: "${articleExcerpt}"

Return a JSON object:
{
  "isSatire": boolean,
  "isOpinion": boolean,
  "credibilityTier": "tier1" | "tier2" | "tier3" | "unknown",
  "concerns": string[]
}`;
}
