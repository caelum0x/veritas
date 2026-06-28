// IndexedDocument — shape of documents stored in the search index
import { z } from "zod";

export const IndexedDocumentSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  fields: z.record(z.string(), z.unknown()),
  meta: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().optional(),
});

export type IndexedDocument = z.infer<typeof IndexedDocumentSchema>;

export function makeIndexedDocument(
  id: string,
  type: string,
  fields: Record<string, unknown>,
  meta?: Record<string, unknown>,
  createdAt?: string
): IndexedDocument {
  return Object.freeze({ id, type, fields, meta, createdAt });
}
