// Summarization prompts — condense verification reports and evidence into human-readable summaries.
import { definePrompt } from "../prompt.js";
import type { PromptTemplate } from "../prompt.js";

export const reportSummaryPrompt: PromptTemplate = definePrompt({
  meta: {
    id: "summarization.report",
    name: "Summarize Verification Report",
    description:
      "Generates a concise, human-readable summary of a completed verification report.",
    category: "summarization",
    tags: ["summary", "report", "verification"],
    version: "1.0.0",
  },
  variables: [
    {
      name: "report",
      description:
        "JSON object representing the full verification report (claims, verdicts, evidence).",
      required: true,
    },
    {
      name: "audienceLevel",
      description:
        "Target audience: 'general', 'journalist', 'researcher', or 'expert'.",
      required: false,
      defaultValue: "general",
    },
    {
      name: "maxWords",
      description: "Maximum word count for the summary.",
      required: false,
      defaultValue: "250",
    },
  ],
  messages: [
    {
      role: "system",
      content: `You are a fact-checking journalist writing summaries for a {{audienceLevel}} audience.

Summarize the provided verification report in at most {{maxWords}} words.

Your summary must include:
1. The overall verdict and confidence level.
2. The key supporting and contradicting evidence (cite source names, not IDs).
3. Any important caveats or limitations.
4. A plain-language bottom line.

Tone guidelines by audience:
- general: Plain English, avoid jargon, use analogies where helpful.
- journalist: Concise, inverted-pyramid structure, attributions clear.
- researcher: Precise, include confidence intervals, note methodology gaps.
- expert: Technical depth acceptable, focus on evidence quality and chain of provenance.

Return only the summary text — no JSON, no headings, no bullet points unless the audience is 'researcher' or 'expert'.`,
    },
    {
      role: "user",
      content: `Summarize this verification report:\n\n{{report}}`,
    },
  ],
  partials: [],
});

export const evidenceSummaryPrompt: PromptTemplate = definePrompt({
  meta: {
    id: "summarization.evidence",
    name: "Summarize Evidence Set",
    description:
      "Condenses a set of evidence snippets into a coherent narrative grouped by stance.",
    category: "summarization",
    tags: ["summary", "evidence", "stance"],
    version: "1.0.0",
  },
  variables: [
    {
      name: "claim",
      description: "The claim the evidence relates to.",
      required: true,
    },
    {
      name: "evidence",
      description: "JSON array of evidence objects with text, sourceUrl, stance.",
      required: true,
    },
    {
      name: "maxWords",
      description: "Maximum word count for the summary.",
      required: false,
      defaultValue: "200",
    },
  ],
  messages: [
    {
      role: "system",
      content: `You are a research assistant summarizing evidence for fact-checkers.

Given the claim and a set of evidence snippets, produce a balanced summary in at most {{maxWords}} words.

Structure:
1. Supporting evidence: what sources say that support the claim.
2. Contradicting evidence: what sources say that contradict the claim.
3. Neutral/inconclusive: sources that are relevant but do not clearly support or contradict.

Cite sources by their domain or publication name. Be objective and neutral.
Return only the summary text.`,
    },
    {
      role: "user",
      content: `Claim: {{claim}}

Evidence:
{{evidence}}`,
    },
  ],
  partials: [],
});

export const claimNormalizationPrompt: PromptTemplate = definePrompt({
  meta: {
    id: "summarization.normalize-claim",
    name: "Normalize Claim Text",
    description:
      "Rewrites a claim into a canonical, unambiguous, present-tense factual statement.",
    category: "summarization",
    tags: ["normalization", "claim", "canonicalization"],
    version: "1.0.0",
  },
  variables: [
    {
      name: "claim",
      description: "The raw claim text to normalize.",
      required: true,
    },
    {
      name: "context",
      description: "Optional surrounding context for disambiguation.",
      required: false,
      defaultValue: "",
    },
  ],
  messages: [
    {
      role: "system",
      content: `You are a claim normalization specialist. Rewrite the given claim so that it is:
- Self-contained (no pronouns without clear referent)
- Present tense or explicitly time-bounded
- Free of hedging language (e.g., "allegedly", "reportedly")
- A single atomic assertion (not compound)

Respond with a JSON object:
{
  "normalizedClaim": "<the rewritten claim>",
  "changesMade": ["<list of changes applied>"],
  "wasCompound": <true|false>,
  "splitClaims": ["<each atomic sub-claim if compound, else empty array>"]
}

Return valid JSON and nothing else.`,
    },
    {
      role: "user",
      content: `Claim: {{claim}}
Context: {{context}}`,
    },
  ],
  partials: [],
});
