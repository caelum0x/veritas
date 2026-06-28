// Verification prompts — fact-check a claim against provided evidence.
import { definePrompt } from "../prompt.js";
import type { PromptTemplate } from "../prompt.js";

export const verificationPrompt: PromptTemplate = definePrompt({
  meta: {
    id: "verification.fact-check",
    name: "Fact-Check Claim",
    description:
      "Evaluates a claim against a set of evidence snippets and returns a structured verdict.",
    category: "verification",
    tags: ["fact-check", "verdict", "evidence"],
    version: "1.0.0",
  },
  variables: [
    {
      name: "claim",
      description: "The claim text to verify.",
      required: true,
    },
    {
      name: "evidence",
      description:
        "JSON array of evidence objects, each with fields: id, text, sourceUrl, sourceTier.",
      required: true,
    },
    {
      name: "language",
      description: "BCP-47 language code for the response.",
      required: false,
      defaultValue: "en",
    },
  ],
  messages: [
    {
      role: "system",
      content: `You are a rigorous fact-verification assistant. Your task is to assess the truthfulness of a claim based solely on the provided evidence.

Respond with a JSON object matching this schema exactly:
{
  "verdict": "TRUE" | "FALSE" | "UNVERIFIABLE" | "DISPUTED" | "MISLEADING",
  "confidence": <number between 0 and 1>,
  "reasoning": "<concise explanation referencing evidence ids>",
  "supportingEvidenceIds": ["<id>", ...],
  "contradictingEvidenceIds": ["<id>", ...]
}

Rules:
- Use ONLY the provided evidence; do not rely on prior knowledge.
- If evidence is insufficient, return UNVERIFIABLE.
- Confidence must reflect the strength and quantity of supporting evidence.
- Keep reasoning under 300 words.
- Return valid JSON and nothing else.`,
    },
    {
      role: "user",
      content: `Claim: {{claim}}

Evidence:
{{evidence}}

Language: {{language}}`,
    },
  ],
  partials: [],
});

export const verificationWithContextPrompt: PromptTemplate = definePrompt({
  meta: {
    id: "verification.with-context",
    name: "Contextual Fact-Check",
    description:
      "Verifies a claim with additional domain context and source metadata.",
    category: "verification",
    tags: ["fact-check", "context", "domain"],
    version: "1.0.0",
  },
  variables: [
    {
      name: "claim",
      description: "The claim text to verify.",
      required: true,
    },
    {
      name: "evidence",
      description: "JSON array of evidence objects.",
      required: true,
    },
    {
      name: "domainContext",
      description: "Domain-specific context (e.g., medical, legal, financial).",
      required: false,
      defaultValue: "general",
    },
    {
      name: "claimDate",
      description: "ISO timestamp when the claim was made.",
      required: false,
      defaultValue: "",
    },
  ],
  messages: [
    {
      role: "system",
      content: `You are a domain-aware fact-verification assistant with expertise in: {{domainContext}}.

Your task is to assess the truthfulness of a claim considering both the evidence and domain-specific nuances.

Respond with a JSON object matching this schema exactly:
{
  "verdict": "TRUE" | "FALSE" | "UNVERIFIABLE" | "DISPUTED" | "MISLEADING",
  "confidence": <number between 0 and 1>,
  "reasoning": "<concise explanation referencing evidence ids>",
  "supportingEvidenceIds": ["<id>", ...],
  "contradictingEvidenceIds": ["<id>", ...],
  "domainNotes": "<any domain-specific caveats or temporal considerations>"
}

Rules:
- Use ONLY the provided evidence; do not rely on prior knowledge.
- Consider temporal context if claimDate is provided.
- Confidence must reflect evidence quality and domain certainty.
- Return valid JSON and nothing else.`,
    },
    {
      role: "user",
      content: `Claim: {{claim}}
Claim Date: {{claimDate}}

Evidence:
{{evidence}}`,
    },
  ],
  partials: [],
});
