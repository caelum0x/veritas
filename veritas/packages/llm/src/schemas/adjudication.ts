// JSON schema for structured adjudication output from the LLM
import { z } from "zod";

/** Zod schema for a single evidence item inside adjudication output */
export const EvidenceItemSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  snippet: z.string().min(1),
  publishedAt: z.string().nullable(),
  stance: z.enum(["supports", "refutes", "neutral"]),
  relevanceScore: z.number().min(0).max(1),
});

/** Zod schema for the full structured adjudication payload */
export const AdjudicationOutputSchema = z.object({
  verdict: z.enum(["TRUE", "FALSE", "MISLEADING", "UNVERIFIABLE", "DISPUTED"]),
  confidence: z.number().min(0).max(1),
  explanation: z.string().min(10),
  supportingEvidence: z.array(EvidenceItemSchema),
  contradictingEvidence: z.array(EvidenceItemSchema),
});

export type AdjudicationOutput = z.infer<typeof AdjudicationOutputSchema>;
export type EvidenceItemOutput = z.infer<typeof EvidenceItemSchema>;

/**
 * Plain JSON Schema object passed to the model's `tools` / structured-output
 * parameter so the LLM knows exactly what shape to produce.
 */
export const ADJUDICATION_JSON_SCHEMA = {
  type: "object",
  required: [
    "verdict",
    "confidence",
    "explanation",
    "supportingEvidence",
    "contradictingEvidence",
  ],
  additionalProperties: false,
  properties: {
    verdict: {
      type: "string",
      enum: ["TRUE", "FALSE", "MISLEADING", "UNVERIFIABLE", "DISPUTED"],
      description: "Final verdict for the claim.",
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description: "Calibrated confidence score between 0 and 1.",
    },
    explanation: {
      type: "string",
      minLength: 10,
      description:
        "Concise explanation (2-5 sentences) justifying the verdict.",
    },
    supportingEvidence: {
      type: "array",
      items: { $ref: "#/$defs/EvidenceItem" },
      description: "Evidence items that support the claim.",
    },
    contradictingEvidence: {
      type: "array",
      items: { $ref: "#/$defs/EvidenceItem" },
      description: "Evidence items that contradict the claim.",
    },
  },
  $defs: {
    EvidenceItem: {
      type: "object",
      required: ["url", "title", "snippet", "publishedAt", "stance", "relevanceScore"],
      additionalProperties: false,
      properties: {
        url: { type: "string", format: "uri" },
        title: { type: "string", minLength: 1 },
        snippet: { type: "string", minLength: 1 },
        publishedAt: { type: ["string", "null"] },
        stance: { type: "string", enum: ["supports", "refutes", "neutral"] },
        relevanceScore: { type: "number", minimum: 0, maximum: 1 },
      },
    },
  },
} as const;
