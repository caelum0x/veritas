// JSON schema for structured claim extraction output from the LLM
import { z } from "zod";

/** Zod schema for a single extracted claim */
export const ExtractedClaimSchema = z.object({
  text: z.string().min(5),
  startOffset: z.number().int().nonnegative().nullable(),
  endOffset: z.number().int().nonnegative().nullable(),
  checkworthiness: z.number().min(0).max(1),
});

/** Zod schema for the full extraction output payload */
export const ExtractionOutputSchema = z.object({
  claims: z.array(ExtractedClaimSchema),
});

export type ExtractedClaimOutput = z.infer<typeof ExtractedClaimSchema>;
export type ExtractionOutput = z.infer<typeof ExtractionOutputSchema>;

/**
 * Plain JSON Schema object passed to the model's structured-output parameter
 * so the LLM knows exactly what shape to produce.
 */
export const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  required: ["claims"],
  additionalProperties: false,
  properties: {
    claims: {
      type: "array",
      description: "Ordered list of extracted factual claims, most check-worthy first.",
      items: {
        type: "object",
        required: ["text", "startOffset", "endOffset", "checkworthiness"],
        additionalProperties: false,
        properties: {
          text: {
            type: "string",
            minLength: 5,
            description: "The verbatim or lightly paraphrased factual claim.",
          },
          startOffset: {
            type: ["integer", "null"],
            minimum: 0,
            description:
              "Character offset in the original document where this claim begins, or null if not determinable.",
          },
          endOffset: {
            type: ["integer", "null"],
            minimum: 0,
            description:
              "Character offset in the original document where this claim ends (exclusive), or null if not determinable.",
          },
          checkworthiness: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description:
              "Score 0–1 indicating how important it is to fact-check this claim. Higher is more important.",
          },
        },
      },
    },
  },
} as const;
