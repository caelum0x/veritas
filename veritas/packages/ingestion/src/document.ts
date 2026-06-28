// Ingested document model: normalized content with provenance metadata.

import { z } from "zod";
import { contentHashSchema } from "@veritas/core";
import { SourceRefSchema } from "./source-ref.js";

export const DocumentSchema = z.object({
  id: z.string().min(1),
  sourceRef: SourceRefSchema,
  mimeType: z.string(),
  rawContent: z.string(),
  textContent: z.string(),
  language: z.string().nullable(),
  contentHash: contentHashSchema,
  wordCount: z.number().int().min(0),
  charCount: z.number().int().min(0),
  extractedAt: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type IngestedDocument = z.infer<typeof DocumentSchema>;

export function makeDocument(fields: z.input<typeof DocumentSchema>): IngestedDocument {
  return DocumentSchema.parse(fields);
}
