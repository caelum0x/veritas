// Shared types and interfaces for the corpus package.

import { z } from "zod";
import { type Score, type IsoTimestamp, scoreSchema, isoTimestampSchema } from "@veritas/core";

/** Filter options for querying corpus records. */
export const CorpusFilterSchema = z.object({
  corpusId: z.string().min(1).optional(),
  domain: z.string().optional(),
  tags: z.array(z.string()).optional(),
  minAuthorityWeight: scoreSchema.optional(),
  minQualityScore: scoreSchema.optional(),
  curatedBy: z.string().optional(),
  createdAfter: isoTimestampSchema.optional(),
  createdBefore: isoTimestampSchema.optional(),
});

export type CorpusFilter = z.infer<typeof CorpusFilterSchema>;

/** Sort options for corpus record queries. */
export type CorpusSortField = "createdAt" | "updatedAt" | "authorityWeight" | "qualityScore";

export const CorpusSortSchema = z.object({
  field: z.enum(["createdAt", "updatedAt", "authorityWeight", "qualityScore"]),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

export type CorpusSort = z.infer<typeof CorpusSortSchema>;

/** Cursor-based page request for corpus queries. */
export const CorpusPageRequestSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(200).default(50),
  filter: CorpusFilterSchema.optional(),
  sort: CorpusSortSchema.optional(),
});

export type CorpusPageRequest = z.infer<typeof CorpusPageRequestSchema>;

/** Authority tier classification derived from authority weight. */
export type AuthorityTier = "primary" | "secondary" | "tertiary" | "unvetted";

/** Map a numeric authority weight score to an authority tier. */
export function toAuthorityTier(weight: Score): AuthorityTier {
  if (weight >= 0.85) return "primary";
  if (weight >= 0.65) return "secondary";
  if (weight >= 0.40) return "tertiary";
  return "unvetted";
}

/** Quality band derived from quality score. */
export type QualityBand = "high" | "medium" | "low" | "rejected";

/** Map a numeric quality score to a quality band. */
export function toQualityBand(score: Score): QualityBand {
  if (score >= 0.80) return "high";
  if (score >= 0.55) return "medium";
  if (score >= 0.30) return "low";
  return "rejected";
}

/** Curation action applied to a corpus record. */
export type CurationAction = "approve" | "reject" | "flag" | "update" | "promote" | "demote";

/** Lightweight reference to a corpus without full metadata. */
export interface CorpusRef {
  readonly id: string;
  readonly name: string;
  readonly domain: string | null;
}

/** Snapshot comparison mode. */
export type DiffMode = "added" | "removed" | "changed" | "all";
