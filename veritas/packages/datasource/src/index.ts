// Public surface re-export for @veritas/datasource: source provenance, authority, and registry.

export * from "./source.js";
export * from "./domain-authority.js";
export * from "./credibility-score.js";
export * from "./allowlist.js";
export * from "./blocklist.js";
export * from "./registry.js";
export * from "./importer.js";
export * from "./classifier.js";
export * from "./store.js";
export * from "./seed.js";
export * from "./normalizer.js";
export * from "./errors.js";

// types.js: export all except names that collide with richer versions in other modules.
export type { ScoredSource, AllowlistEntry, BlocklistEntry, SourceClassification, SourceCategory } from "./types.js";
// SourceQuery from types.js is the store filter-options bag; alias to avoid clash with query runner.
export type { SourceQuery as SourceQueryOptions_ } from "./types.js";
// ReputationLink from types.js is a simple domain-link record; alias to avoid clash with the richer interface.
export type { ReputationLink as ReputationDomainLink } from "./types.js";
// SourceQuery from types.js (the primary name used by store.ts internally) is also exposed as SourceStoreQuery.
export type { SourceQuery as SourceStoreQuery } from "./types.js";

// reputation-link.js: the full ReputationLink interface with link/unlink/resolve methods.
export * from "./reputation-link.js";

// query.js: SourceQuery here is the query-runner type; export it as SourceQueryRunner to avoid name clash.
export type {
  SourceFilter,
  SourceSortField,
  SortDirection,
  SourceSort,
  SourcePage,
  SourceQueryOptions,
  SourceQuery as SourceQueryRunner,
} from "./query.js";
export { createSourceQuery } from "./query.js";
