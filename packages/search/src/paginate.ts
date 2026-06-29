// Paginates ranked search results into a Page using cursor-based navigation.
import { type Page, makePage, encodeCursor, decodeCursor, isOk } from "@veritas/core";
import type { SearchResult } from "./ranking.js";

export interface SearchPage {
  hits: SearchResult[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function paginateResults(
  results: readonly SearchResult[],
  limit: number,
  cursor?: string
): Page<SearchResult> {
  let safeOffset = 0;
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (isOk(decoded)) {
      const val = decoded.value["offset"];
      if (typeof val === "number") safeOffset = val;
    }
  }
  const slice = results.slice(safeOffset, safeOffset + limit);
  const hasNext = safeOffset + limit < results.length;
  const nextCursor = hasNext
    ? encodeCursor({ offset: safeOffset + limit })
    : null;

  return makePage(slice, nextCursor);
}
