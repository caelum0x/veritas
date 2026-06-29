// Query parser — parse search query strings into structured query objects
import { z } from "zod";
import { tokenize } from "./tokenizer.js";

export const QueryOperator = {
  AND: "AND",
  OR: "OR",
} as const;
export type QueryOperator = (typeof QueryOperator)[keyof typeof QueryOperator];

export const SearchQuerySchema = z.object({
  raw: z.string(),
  terms: z.array(z.string()),
  operator: z.enum(["AND", "OR"]).default("OR"),
  fields: z.array(z.string()).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  pageSize: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  minScore: z.number().min(0).max(1).default(0),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export interface ParseQueryOptions {
  readonly defaultOperator?: QueryOperator;
  readonly fields?: readonly string[];
  readonly pageSize?: number;
  readonly cursor?: string;
  readonly filters?: Record<string, unknown>;
  readonly minScore?: number;
}

function detectOperator(raw: string): QueryOperator {
  if (/\bAND\b/.test(raw)) return QueryOperator.AND;
  if (/\bOR\b/.test(raw)) return QueryOperator.OR;
  return QueryOperator.OR;
}

function stripOperators(raw: string): string {
  return raw.replace(/\b(AND|OR|NOT)\b/g, " ").trim();
}

export function parseQuery(raw: string, options: ParseQueryOptions = {}): SearchQuery {
  const operator = options.defaultOperator ?? detectOperator(raw);
  const stripped = stripOperators(raw);
  const terms = tokenize(stripped, { minLength: 1 });
  return SearchQuerySchema.parse({
    raw,
    terms: [...new Set(terms)],
    operator,
    fields: options.fields ? [...options.fields] : undefined,
    filters: options.filters,
    pageSize: options.pageSize ?? 20,
    cursor: options.cursor,
    minScore: options.minScore ?? 0,
  });
}

export function isEmptyQuery(query: SearchQuery): boolean {
  return query.terms.length === 0 && (!query.filters || Object.keys(query.filters).length === 0);
}
