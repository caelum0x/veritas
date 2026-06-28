// Cursor-based pagination primitives: Page<T>, PageRequest, cursor codec.

import { err, ok, type Result } from "./result.js";

/** Default and maximum page sizes for list endpoints. */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** A request for a page of results. */
export interface PageRequest {
  /** Number of items requested (clamped to [1, MAX_PAGE_SIZE]). */
  readonly limit: number;
  /** Opaque cursor pointing just past the last seen item, if any. */
  readonly cursor?: string;
}

/** A page of results plus a cursor to fetch the next page. */
export interface Page<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

/** Normalize raw inputs into a safe PageRequest. */
export function toPageRequest(input: {
  limit?: number;
  cursor?: string;
}): PageRequest {
  const limit = clampLimit(input.limit ?? DEFAULT_PAGE_SIZE);
  return input.cursor ? { limit, cursor: input.cursor } : { limit };
}

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(limit)));
}

/** Encode an opaque cursor from a record of primitive fields. */
export function encodeCursor(payload: Record<string, string | number>): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

/** Decode an opaque cursor back into its payload. */
export function decodeCursor(
  cursor: string,
): Result<Record<string, string | number>, Error> {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return err(new Error("Cursor payload is not an object"));
    }
    return ok(parsed as Record<string, string | number>);
  } catch (cause) {
    return err(cause instanceof Error ? cause : new Error("Invalid cursor"));
  }
}

/** Build a Page<T> from items plus an optional next cursor. */
export function makePage<T>(
  items: readonly T[],
  nextCursor: string | null,
): Page<T> {
  return { items, nextCursor, hasMore: nextCursor !== null };
}
