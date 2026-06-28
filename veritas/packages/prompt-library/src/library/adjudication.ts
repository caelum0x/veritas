// Adjudication prompts — resolve conflicting verdicts across multiple verifier outputs.
import { definePrompt } from "../prompt.js";
import type { PromptTemplate } from "../prompt.js";

export const adjudicationPrompt: PromptTemplate = definePrompt({
  meta: {
    id: "adjudication.resolve-conflict",
    name: "Resolve Conflicting Verdicts",
    description:
      "Adjudicates disagreements between multiple verifier verdicts for a single claim.",
    category: "adjudication",
    tags: ["adjudication", "conflict-resolution", "multi-verifier"],
    version: "1.0.0",
  },
  variables: [
    {
      name: "claim",
      description: "The claim being adjudicated.",
      required: true,
    },
    {
      name: "verdicts",
      description:
        "JSON array of verifier output objects, each with: verifierId, verdict, confidence, reasoning.",
      required: true,
    },
    {
      name: "evidence",
      description:
        "JSON array of all evidence objects referenced across verifiers.",
      required: true,
    },
  ],
  messages: [
    {
      role: "system",
      content: `You are a chief adjudicator responsible for resolving conflicts between multiple independent fact-checkers.

You will receive a claim, an array of verifier verdicts (potentially conflicting), and the underlying evidence pool.

Your task is to synthesize a final authoritative verdict.

Respond with a JSON object matching this schema exactly:
{
  "finalVerdict": "TRUE" | "FALSE" | "UNVERIFIABLE" | "DISPUTED" | "MISLEADING",
  "finalConfidence": <number between 0 and 1>,
  "reasoning": "<explanation of how conflicts were resolved, referencing verifier IDs and evidence>",
  "consensusStrength": "STRONG" | "MODERATE" | "WEAK" | "NONE",
  "dissents": [
    {
      "verifierId": "<id>",
      "theirVerdict": "<verdict>",
      "whyOverridden": "<short explanation>"
    }
  ],
  "keyEvidenceIds": ["<id>", ...]
}

Rules:
- Weight verifiers equally unless their reasoning quality or evidence citations differ.
- Prefer the verdict supported by the most and highest-quality evidence.
- If evidence is genuinely ambiguous across verifiers, use DISPUTED or UNVERIFIABLE.
- Return valid JSON and nothing else.`,
    },
    {
      role: "user",
      content: `Claim: {{claim}}

Verifier Verdicts:
{{verdicts}}

Evidence Pool:
{{evidence}}`,
    },
  ],
  partials: [],
});

export const tieBreakAdjudicationPrompt: PromptTemplate = definePrompt({
  meta: {
    id: "adjudication.tie-break",
    name: "Tie-Break Adjudication",
    description:
      "Resolves exact tie votes between verifiers by deep evidence re-analysis.",
    category: "adjudication",
    tags: ["adjudication", "tie-break", "evidence-analysis"],
    version: "1.0.0",
  },
  variables: [
    {
      name: "claim",
      description: "The claim being adjudicated.",
      required: true,
    },
    {
      name: "tiedVerdicts",
      description: "JSON array of exactly tied verifier verdicts.",
      required: true,
    },
    {
      name: "evidence",
      description: "JSON array of all available evidence.",
      required: true,
    },
    {
      name: "sourceTierWeights",
      description:
        "JSON object mapping SourceTier to numeric weight (e.g. {\"TIER_1\": 3, \"TIER_2\": 2, \"TIER_3\": 1}).",
      required: false,
      defaultValue: "{\"TIER_1\": 3, \"TIER_2\": 2, \"TIER_3\": 1}",
    },
  ],
  messages: [
    {
      role: "system",
      content: `You are a senior adjudicator resolving an exact tie between fact-checkers.

Apply source-tier weighted evidence scoring using: {{sourceTierWeights}}

Respond with a JSON object matching this schema exactly:
{
  "finalVerdict": "TRUE" | "FALSE" | "UNVERIFIABLE" | "DISPUTED" | "MISLEADING",
  "finalConfidence": <number between 0 and 1>,
  "weightedScoreBreakdown": {
    "trueScore": <number>,
    "falseScore": <number>,
    "rationale": "<how scores were computed>"
  },
  "reasoning": "<explanation of the tie-break decision>",
  "keyEvidenceIds": ["<id>", ...]
}

Return valid JSON and nothing else.`,
    },
    {
      role: "user",
      content: `Claim: {{claim}}

Tied Verdicts:
{{tiedVerdicts}}

Evidence:
{{evidence}}`,
    },
  ],
  partials: [],
});
