// Corpus search: full-text and filtered search over corpus records.

import { z } from "zod";
import { scoreSchema, type Score, type Result, ok } from "@veritas/core";
import { type CorpusRecord } from "./record.js";

export const SearchQuerySchema = z.object({
  text: z.string().optional(),
  corpusId: z.string().optional(),
  domain: z.string().optional(),
  tags: z.array(z.string()).optional(),
  minAuthorityWeight: scoreSchema.optional(),
  minQualityScore: scoreSchema.optional(),
  publisher: z.string().optional(),
  limit: z.number().int().positive().max(200).default(20),
  offset: z.number().int().nonnegative().default(0),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export interface SearchResult {
  readonly record: CorpusRecord;
  readonly score: number;
}

export interface SearchResponse {
  readonly results: readonly SearchResult[];
  readonly total: number;
  readonly query: SearchQuery;
}

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function tokenize(text: string): ReadonlySet<string> {
  return new Set(text.split(/\s+/).map(normalize).filter(Boolean));
}

function textScore(record: CorpusRecord, tokens: ReadonlySet<string>): number {
  if (tokens.size === 0) return 1;
  const fields = [
    record.source.title ?? "",
    record.source.publisher ?? "",
    record.source.domain,
    record.source.excerpt ?? "",
    record.notes ?? "",
    ...record.tags,
  ]
    .map(normalize)
    .join(" ");
  let hits = 0;
  for (const token of tokens) {
    if (fields.includes(token)) hits += 1;
  }
  return hits / tokens.size;
}

function matchesFilters(record: CorpusRecord, query: SearchQuery): boolean {
  if (query.corpusId && record.corpusId !== query.corpusId) return false;
  if (query.domain && record.source.domain !== query.domain) return false;
  if (query.publisher && record.source.publisher !== query.publisher) return false;
  if (query.minAuthorityWeight !== undefined && record.authorityWeight < query.minAuthorityWeight) return false;
  if (query.minQualityScore !== undefined && record.qualityScore < query.minQualityScore) return false;
  if (query.tags && query.tags.length > 0) {
    const recordTags = new Set(record.tags);
    if (!query.tags.every((t) => recordTags.has(t))) return false;
  }
  return true;
}

export function searchRecords(
  records: readonly CorpusRecord[],
  query: SearchQuery,
): Result<SearchResponse> {
  const tokens = query.text ? tokenize(query.text) : new Set<string>();

  const scored: SearchResult[] = records
    .filter((r) => matchesFilters(r, query))
    .map((record) => ({ record, score: textScore(record, tokens) }))
    .filter((r) => r.score > 0 || tokens.size === 0)
    .sort((a, b) => b.score - a.score);

  const total = scored.length;
  const results = scored.slice(query.offset, query.offset + query.limit);

  return ok({ results, total, query });
}
