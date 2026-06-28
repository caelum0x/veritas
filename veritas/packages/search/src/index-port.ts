// SearchIndex interface — contract for all index implementations
import type { IndexedDocument } from "./document.js";
import type { SearchQuery } from "./query.js";
import type { SearchResult } from "./ranking.js";
import type { Page } from "@veritas/core";

export interface IndexOptions {
  readonly fields: readonly string[];
  readonly storeFields?: readonly string[];
}

export interface SearchIndex {
  add(doc: IndexedDocument): Promise<void>;
  addMany(docs: readonly IndexedDocument[]): Promise<void>;
  remove(id: string): Promise<boolean>;
  search(query: SearchQuery): Promise<Page<SearchResult>>;
  clear(): Promise<void>;
  size(): number;
}
