// Corpus record: a single trusted-source entry stored within a corpus.

import { z } from "zod";
import { type IsoTimestamp, type ContentHash, type Score, scoreSchema, isoTimestampSchema, contentHashSchema } from "@veritas/core";
import { SourceSchema } from "@veritas/contracts";

export const CorpusRecordSchema = z.object({
  id: z.string().min(1),
  corpusId: z.string().min(1),
  source: SourceSchema,
  authorityWeight: scoreSchema,
  qualityScore: scoreSchema,
  contentHash: contentHashSchema.nullable(),
  tags: z.array(z.string()),
  notes: z.string().nullable(),
  curatedAt: isoTimestampSchema,
  curatedBy: z.string().nullable(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export type CorpusRecord = z.infer<typeof CorpusRecordSchema>;

export const CreateCorpusRecordSchema = z.object({
  corpusId: z.string().min(1),
  source: SourceSchema,
  authorityWeight: scoreSchema.optional(),
  qualityScore: scoreSchema.optional(),
  contentHash: contentHashSchema.nullable().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
  curatedBy: z.string().nullable().optional(),
});

export type CreateCorpusRecord = z.infer<typeof CreateCorpusRecordSchema>;
