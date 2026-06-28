// Search index port: abstract interface + in-memory implementation for listing full-text search.

import { type Result, ok, err, InternalError } from "@veritas/core";
import type { Listing, ListingId } from "./listing.js";

/** A scored search hit. */
export interface SearchHit {
  readonly listingId: ListingId;
  readonly score: number;
}

/** Options passed when querying the search index. */
export interface SearchOptions {
  readonly query: string;
  readonly categoryId?: string;
  readonly tagIds?: readonly string[];
  readonly limit?: number;
  readonly offset?: number;
}

/** Port: the search index backend. */
export interface SearchIndex {
  /** Index or re-index a single listing. */
  index(listing: Listing): Promise<Result<void>>;
  /** Remove a listing from the index. */
  remove(listingId: ListingId): Promise<Result<void>>;
  /** Full-text search returning scored hits. */
  search(options: SearchOptions): Promise<Result<SearchHit[]>>;
  /** Rebuild the entire index from a snapshot. */
  reindex(listings: readonly Listing[]): Promise<Result<void>>;
}

/** Tokenise a string into lowercase terms for matching. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\-_.,;:!?()[\]{}"'/\\]+/)
    .filter((t) => t.length > 1);
}

/** Score a listing against a set of query tokens (simple TF approximation). */
function scoreDoc(listing: Listing, queryTokens: string[]): number {
  const fields = [
    { text: listing.title, weight: 3 },
    { text: listing.description, weight: 1 },
  ];
  const docTokens = fields.flatMap(({ text, weight }) =>
    tokenize(text).map((t) => ({ t, weight })),
  );

  let score = 0;
  for (const qt of queryTokens) {
    for (const { t, weight } of docTokens) {
      if (t === qt || t.startsWith(qt)) {
        score += weight;
      }
    }
  }
  return score;
}

/** In-memory implementation of SearchIndex — suitable for dev/testing. */
export class InMemorySearchIndex implements SearchIndex {
  private readonly docs = new Map<ListingId, Listing>();

  async index(listing: Listing): Promise<Result<void>> {
    this.docs.set(listing.id, listing);
    return ok(undefined);
  }

  async remove(listingId: ListingId): Promise<Result<void>> {
    this.docs.delete(listingId);
    return ok(undefined);
  }

  async search(options: SearchOptions): Promise<Result<SearchHit[]>> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;
    const queryTokens = tokenize(options.query);

    if (queryTokens.length === 0) {
      return ok([]);
    }

    const candidates = Array.from(this.docs.values()).filter((l) => {
      if (options.categoryId && l.categoryId !== options.categoryId) return false;
      if (options.tagIds && options.tagIds.length > 0) {
        const matched = options.tagIds.some((t) => l.tagIds.includes(t));
        if (!matched) return false;
      }
      return true;
    });

    const hits: SearchHit[] = candidates
      .map((l) => ({ listingId: l.id, score: scoreDoc(l, queryTokens) }))
      .filter((h) => h.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(offset, offset + limit);

    return ok(hits);
  }

  async reindex(listings: readonly Listing[]): Promise<Result<void>> {
    this.docs.clear();
    for (const listing of listings) {
      this.docs.set(listing.id, listing);
    }
    return ok(undefined);
  }
}
