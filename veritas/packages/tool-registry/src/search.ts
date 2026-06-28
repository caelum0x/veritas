// Full-text and faceted search over registered tool descriptors.

import { z } from "zod";
import type { ToolDescriptor } from "./descriptor.js";
import type { ToolCategory } from "./category.js";
import type { ToolStatus } from "./descriptor.js";

export const searchQuerySchema = z.object({
  q: z.string().optional(),
  category: z
    .enum([
      "verification",
      "search",
      "analysis",
      "data",
      "communication",
      "storage",
      "llm",
      "utility",
      "security",
      "monitoring",
    ])
    .optional(),
  status: z.enum(["active", "deprecated", "disabled"]).optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().optional(),
  includeDeprecated: z.boolean().default(false),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

export interface SearchResult {
  readonly items: readonly ToolDescriptor[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

/** Normalize text for matching: lowercase, collapse whitespace. */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Return true when the descriptor matches the free-text query. */
function matchesQuery(descriptor: ToolDescriptor, query: string): boolean {
  const needle = normalizeText(query);
  if (!needle) return true;
  const haystack = normalizeText(
    [
      descriptor.id,
      descriptor.name,
      descriptor.description,
      ...descriptor.tags,
    ].join(" "),
  );
  return haystack.includes(needle);
}

/** Apply all active filters and return a paginated SearchResult. */
export function searchTools(
  tools: readonly ToolDescriptor[],
  rawQuery: SearchQuery,
): SearchResult {
  const query = searchQuerySchema.parse(rawQuery);

  const filtered = tools.filter((t) => {
    if (!query.includeDeprecated && t.deprecated) return false;
    if (query.status && t.status !== query.status) return false;
    if (query.category && t.category !== query.category) return false;
    if (query.author && t.author !== query.author) return false;
    if (query.tags && query.tags.length > 0) {
      const toolTagSet = new Set(t.tags);
      if (!query.tags.every((tag) => toolTagSet.has(tag))) return false;
    }
    if (query.q && !matchesQuery(t, query.q)) return false;
    return true;
  });

  const total = filtered.length;
  const items = filtered.slice(query.offset, query.offset + query.limit);

  return { items, total, limit: query.limit, offset: query.offset };
}

/** Collect all unique tags across a set of descriptors. */
export function aggregateTags(tools: readonly ToolDescriptor[]): string[] {
  const tagSet = new Set<string>();
  for (const t of tools) {
    for (const tag of t.tags) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet).sort();
}

/** Count tools per category. */
export function aggregateByCategory(
  tools: readonly ToolDescriptor[],
): Record<ToolCategory, number> {
  const counts = {} as Record<ToolCategory, number>;
  for (const t of tools) {
    counts[t.category] = (counts[t.category] ?? 0) + 1;
  }
  return counts;
}

/** Count tools per status. */
export function aggregateByStatus(
  tools: readonly ToolDescriptor[],
): Record<ToolStatus, number> {
  const counts = {} as Record<ToolStatus, number>;
  for (const t of tools) {
    counts[t.status] = (counts[t.status] ?? 0) + 1;
  }
  return counts;
}
