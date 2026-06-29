// Public surface of @veritas/search — re-exports all modules.
export type { SearchIndex } from "./index-port.js";
export { MemorySearchIndex } from "./memory-index.js";
export type { IndexedDocument } from "./document.js";
export { tokenize } from "./tokenizer.js";
export { parseQuery } from "./query.js";
export type { SearchQuery } from "./query.js";
export { rankResults } from "./ranking.js";
export type { SearchResult } from "./ranking.js";
export { reportToIndexedDocument, indexReports } from "./report-indexer.js";
export { analyze } from "./analyzer.js";
export type { AnalyzerOptions } from "./analyzer.js";
export { highlight } from "./highlight.js";
export type { HighlightOptions } from "./highlight.js";
export { aggregateFacets } from "./facets.js";
export type { FacetRequest, FacetResult } from "./facets.js";
export { paginateResults } from "./paginate.js";
export type { SearchPage } from "./paginate.js";
export { SearchIndexError, SearchQueryError, DocumentNotFoundError } from "./errors.js";
