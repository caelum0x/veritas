// Research phase prompt template — instructs the model to use web search and gather evidence
import type { ResearchOptions } from "../provider.js";

/** Build the user-turn prompt for the research phase */
export function buildResearchPrompt(
  claimText: string,
  options?: ResearchOptions,
): string {
  const maxQueries = options?.maxSearchQueries ?? 5;

  return `Research the following claim and gather evidence from the web.

CLAIM:
"${claimText}"

Instructions:
1. Issue up to ${maxQueries} targeted search queries to find relevant evidence.
2. Prefer primary or authoritative sources (official bodies, peer-reviewed studies, major news organisations).
3. Collect evidence both supporting AND contradicting the claim.
4. For each piece of evidence record: the source URL, title, a short snippet, publication date (if visible), and whether it supports, refutes, or is neutral toward the claim.
5. After all searches are complete, write a brief evidence summary (3-5 sentences) describing what you found.

Begin your research now.`;
}
