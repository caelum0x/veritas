// Adjudication phase prompt template — instructs the model to produce a structured verdict
import type { AdjudicateOptions } from "../provider.js";
import type { EvidenceItem } from "../types.js";

/** Render a single evidence item as a numbered bullet for inclusion in the prompt */
function renderEvidence(item: EvidenceItem, index: number): string {
  const date = item.publishedAt ? ` (${item.publishedAt})` : "";
  return `${index + 1}. [${item.stance.toUpperCase()}] ${item.title}${date}
   URL: ${item.url}
   Snippet: ${item.snippet}`;
}

/** Build the user-turn prompt for the adjudication phase */
export function buildAdjudicationPrompt(
  claimText: string,
  options?: AdjudicateOptions,
): string {
  const research = options?.researchResult;

  const evidenceSection =
    research && research.evidence.length > 0
      ? `EVIDENCE GATHERED (${research.evidence.length} items):\n${research.evidence.map(renderEvidence).join("\n\n")}`
      : "EVIDENCE GATHERED:\nNo pre-fetched evidence available. Use only what you know with high confidence.";

  return `Adjudicate the following claim based on the evidence provided.

CLAIM:
"${claimText}"

${evidenceSection}

Task:
Analyse the evidence above and produce a single JSON object with this exact shape:

{
  "verdict": "<TRUE|FALSE|MISLEADING|DISPUTED|UNVERIFIABLE>",
  "confidence": <0.0 to 1.0>,
  "explanation": "<2-5 sentence justification>",
  "supportingEvidence": [<EvidenceItem>, ...],
  "contradictingEvidence": [<EvidenceItem>, ...]
}

Each EvidenceItem in the arrays must have: url, title, snippet, publishedAt (string or null), stance, relevanceScore (0-1).
Only include items from the provided evidence list. Do not fabricate sources.
Output the JSON object only — no prose outside the braces.`;
}
