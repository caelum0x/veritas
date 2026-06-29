// Trusted source corpus: named collection of curated records with metadata.

import { z } from "zod";
import { isoTimestampSchema, scoreSchema } from "@veritas/core";

export const CorpusSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  domain: z.string().nullable(),
  ownerOrgId: z.string().nullable(),
  minAuthorityWeight: scoreSchema,
  minQualityScore: scoreSchema,
  recordCount: z.number().int().nonnegative(),
  isPublic: z.boolean(),
  tags: z.array(z.string()),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export type Corpus = z.infer<typeof CorpusSchema>;

export const CreateCorpusSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  ownerOrgId: z.string().nullable().optional(),
  minAuthorityWeight: scoreSchema.optional(),
  minQualityScore: scoreSchema.optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export type CreateCorpus = z.infer<typeof CreateCorpusSchema>;

export const UpdateCorpusSchema = CreateCorpusSchema.partial();
export type UpdateCorpus = z.infer<typeof UpdateCorpusSchema>;
