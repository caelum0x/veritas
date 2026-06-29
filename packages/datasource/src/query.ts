// Source query: filter, sort, and paginate source records from the registry.

import { type SourceTier } from "@veritas/core";
import { type Source } from "@veritas/contracts";
import { type SourceRegistry } from "./registry.js";
import { type SourceClass, classifySource } from "./classifier.js";

export interface SourceFilter {
  readonly domain?: string;
  readonly tier?: SourceTier;
  readonly sourceClass?: SourceClass;
  readonly publisher?: string;
  readonly titleContains?: string;
  readonly retrievedAfter?: string;
  readonly retrievedBefore?: string;
}

export type SourceSortField = "domain" | "tier" | "retrievedAt" | "createdAt" | "updatedAt";
export type SortDirection = "asc" | "desc";

export interface SourceSort {
  readonly field: SourceSortField;
  readonly direction: SortDirection;
}

export interface SourcePage {
  readonly items: readonly Source[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
}

export interface SourceQueryOptions {
  readonly filter?: SourceFilter;
  readonly sort?: SourceSort;
  readonly offset?: number;
  readonly limit?: number;
}

const TIER_ORDER: Record<SourceTier, number> = {
  PRIMARY: 0,
  SECONDARY: 1,
  TERTIARY: 2,
  UNKNOWN: 3,
};

function matchesFilter(source: Source, filter: SourceFilter): boolean {
  if (filter.domain !== undefined && source.domain !== filter.domain) return false;
  if (filter.tier !== undefined && source.tier !== filter.tier) return false;
  if (filter.publisher !== undefined) {
    if (!source.publisher || !source.publisher.toLowerCase().includes(filter.publisher.toLowerCase())) {
      return false;
    }
  }
  if (filter.titleContains !== undefined) {
    if (!source.title || !source.title.toLowerCase().includes(filter.titleContains.toLowerCase())) {
      return false;
    }
  }
  if (filter.retrievedAfter !== undefined && source.retrievedAt < filter.retrievedAfter) return false;
  if (filter.retrievedBefore !== undefined && source.retrievedAt > filter.retrievedBefore) return false;
  if (filter.sourceClass !== undefined) {
    const cls = classifySource(source.domain, source.url);
    if (cls.sourceClass !== filter.sourceClass) return false;
  }
  return true;
}

function compareBy(a: Source, b: Source, sort: SourceSort): number {
  const dir = sort.direction === "asc" ? 1 : -1;
  switch (sort.field) {
    case "domain":
      return dir * a.domain.localeCompare(b.domain);
    case "tier":
      return dir * (TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
    case "retrievedAt":
      return dir * a.retrievedAt.localeCompare(b.retrievedAt);
    case "createdAt":
      return dir * a.createdAt.localeCompare(b.createdAt);
    case "updatedAt":
      return dir * a.updatedAt.localeCompare(b.updatedAt);
    default:
      return 0;
  }
}

export function createSourceQuery(registry: SourceRegistry) {
  function query(options: SourceQueryOptions = {}): SourcePage {
    const { filter, sort, offset = 0, limit = 20 } = options;

    let results = registry.list() as Source[];

    if (filter) {
      results = results.filter((s) => matchesFilter(s, filter));
    }

    if (sort) {
      results = [...results].sort((a, b) => compareBy(a, b, sort));
    }

    const total = results.length;
    const items = results.slice(offset, offset + limit);

    return { items, total, offset, limit };
  }

  function findByDomain(domain: string): readonly Source[] {
    return registry.findByDomain(domain);
  }

  function findByTier(tier: SourceTier): readonly Source[] {
    return registry.list().filter((s) => s.tier === tier);
  }

  function count(filter?: SourceFilter): number {
    const all = registry.list() as Source[];
    if (!filter) return all.length;
    return all.filter((s) => matchesFilter(s, filter)).length;
  }

  return { query, findByDomain, findByTier, count };
}

export type SourceQuery = ReturnType<typeof createSourceQuery>;
