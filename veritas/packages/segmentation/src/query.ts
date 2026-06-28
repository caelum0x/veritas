// Segment query — filter and sort segments by criteria.
import { z } from "zod";
import { type Result, ok, err } from "@veritas/core";
import { SegmentId, SegmentIdSchema, SegmentKind, QueryFilter } from "./types.js";
import { InvalidRuleError } from "./errors.js";

export const QueryFilterSchema = z.object({
  kind: z.enum(["static", "dynamic"]).optional(),
  tag: z.string().min(1).optional(),
});

export const SegmentQuerySchema = z.object({
  filter: QueryFilterSchema.optional(),
  limit: z.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
  includeIds: z.array(SegmentIdSchema).optional(),
  excludeIds: z.array(SegmentIdSchema).optional(),
});

export type SegmentQuery = z.infer<typeof SegmentQuerySchema>;

export interface SegmentQueryResult<T> {
  readonly items: ReadonlyArray<T>;
  readonly nextCursor: string | undefined;
  readonly total: number;
}

/** Parse and validate a raw segment query payload. */
export function parseSegmentQuery(raw: unknown): Result<SegmentQuery, InvalidRuleError> {
  const parsed = SegmentQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return err(new InvalidRuleError(parsed.error.issues[0]?.message ?? "invalid query"));
  }
  return ok(parsed.data);
}

/** Check whether a segment's kind/tag matches the given filter. */
export function matchesFilter(
  segmentKind: SegmentKind,
  segmentTags: ReadonlyArray<string>,
  filter: QueryFilter
): boolean {
  if (filter.kind !== undefined && segmentKind !== filter.kind) return false;
  if (filter.tag !== undefined && !segmentTags.includes(filter.tag)) return false;
  return true;
}

/** Build a page of results with cursor-based pagination over a sorted array. */
export function paginate<T extends { id: SegmentId }>(
  items: ReadonlyArray<T>,
  query: SegmentQuery
): SegmentQueryResult<T> {
  const { limit, cursor, includeIds, excludeIds } = query;

  let filtered = items;

  if (includeIds !== undefined && includeIds.length > 0) {
    const includeSet = new Set<string>(includeIds);
    filtered = filtered.filter((item) => includeSet.has(item.id));
  }

  if (excludeIds !== undefined && excludeIds.length > 0) {
    const excludeSet = new Set<string>(excludeIds);
    filtered = filtered.filter((item) => !excludeSet.has(item.id));
  }

  const total = filtered.length;

  let startIndex = 0;
  if (cursor !== undefined) {
    const idx = filtered.findIndex((item) => item.id === cursor);
    startIndex = idx >= 0 ? idx + 1 : 0;
  }

  const page = filtered.slice(startIndex, startIndex + limit);
  const lastItem = page[page.length - 1];
  const nextCursor =
    startIndex + limit < total && lastItem !== undefined ? lastItem.id : undefined;

  return { items: page, nextCursor, total };
}
