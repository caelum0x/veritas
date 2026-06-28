// Cursor-based pagination helpers for in-memory and database repositories.
import {
  encodeCursor,
  decodeCursor,
  makePage,
  toPageRequest,
  isOk,
  DEFAULT_PAGE_SIZE,
  type Page,
  type PageRequest,
} from "@veritas/core";

/** Apply cursor-based pagination to a sorted array of rows, returning a Page. */
export function paginateArray<T extends { id: string }>(
  rows: T[],
  pageRequest: PageRequest | undefined,
  getId: (row: T) => string = (r) => r.id
): Page<T> {
  const req = toPageRequest(pageRequest ?? {});
  const limit = req.limit ?? DEFAULT_PAGE_SIZE;
  const cursor = req.cursor;

  let startIndex = 0;
  if (cursor !== undefined) {
    const decoded = decodeCursor(cursor);
    if (isOk(decoded)) {
      const cursorId = decoded.value["id"];
      if (typeof cursorId === "string") {
        const idx = rows.findIndex((r) => getId(r) === cursorId);
        startIndex = idx >= 0 ? idx + 1 : 0;
      }
    }
  }

  const slice = rows.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < rows.length;
  const nextCursor =
    hasMore && slice.length > 0
      ? encodeCursor({ id: getId(slice[slice.length - 1]!) })
      : null;

  return makePage(slice, nextCursor);
}

/** Build a PageRequest from a raw cursor string and limit. */
export function buildPageRequest(cursor?: string, limit?: number): PageRequest {
  return toPageRequest({ cursor, limit });
}

export { encodeCursor, decodeCursor };
