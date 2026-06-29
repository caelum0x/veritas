// MDX-lite query builder and executor for OLAP cube operations.
import { z } from "zod";
import { ok, err, type Result } from "@veritas/core";
import { InvalidQueryError } from "./errors.js";
import { AggregationFnSchema, SortDirectionSchema, type DimensionCoord, type CellValue, type CoordKey } from "./types.js";
import { encodeCoord } from "./types.js";
import type { Measure } from "./measure.js";
import { aggregate, formatMeasure } from "./measure.js";

/** A filter predicate in a query. */
export const QueryFilterSchema = z.object({
  dimension: z.string().min(1),
  op: z.enum(["eq", "neq", "in", "not_in", "gt", "gte", "lt", "lte"]),
  value: z.union([z.string(), z.number(), z.null(), z.array(z.union([z.string(), z.number(), z.null()]))]),
});
export type QueryFilter = z.infer<typeof QueryFilterSchema>;

/** Sort specification on a measure or dimension. */
export const QuerySortSchema = z.object({
  field: z.string().min(1),
  direction: SortDirectionSchema,
});
export type QuerySort = z.infer<typeof QuerySortSchema>;

/** Complete MDX-lite query specification. */
export const OlapQuerySchema = z.object({
  cubeName: z.string().min(1),
  measures: z.array(z.string().min(1)).min(1),
  dimensions: z.array(z.string().min(1)).default([]),
  filters: z.array(QueryFilterSchema).default([]),
  sort: z.array(QuerySortSchema).default([]),
  limit: z.number().int().positive().max(10_000).optional(),
  offset: z.number().int().nonnegative().default(0),
});
export type OlapQuery = z.infer<typeof OlapQuerySchema>;

export interface QueryResultRow {
  readonly coord: DimensionCoord;
  readonly values: Readonly<Record<string, CellValue>>;
}

export interface QueryResult {
  readonly rows: readonly QueryResultRow[];
  readonly totalRows: number;
  readonly executionMs: number;
  readonly query: OlapQuery;
}

/** Raw fact row used as input for in-memory query execution. */
export type FactRow = Readonly<Record<string, unknown>>;

/** Evaluate a single filter predicate against a fact row. */
function evalFilter(row: FactRow, filter: QueryFilter): boolean {
  const val = row[filter.dimension];
  switch (filter.op) {
    case "eq":
      return val === filter.value;
    case "neq":
      return val !== filter.value;
    case "gt":
      return typeof val === "number" && typeof filter.value === "number" && val > filter.value;
    case "gte":
      return typeof val === "number" && typeof filter.value === "number" && val >= filter.value;
    case "lt":
      return typeof val === "number" && typeof filter.value === "number" && val < filter.value;
    case "lte":
      return typeof val === "number" && typeof filter.value === "number" && val <= filter.value;
    case "in":
      return Array.isArray(filter.value) && (filter.value as unknown[]).includes(val);
    case "not_in":
      return Array.isArray(filter.value) && !(filter.value as unknown[]).includes(val);
  }
}

/** Group fact rows by the selected dimensions into buckets. */
function groupByDimensions(
  rows: readonly FactRow[],
  dimensions: readonly string[]
): Map<CoordKey, { coord: DimensionCoord; rows: FactRow[] }> {
  const groups = new Map<CoordKey, { coord: DimensionCoord; rows: FactRow[] }>();

  for (const row of rows) {
    const coord: DimensionCoord = Object.fromEntries(
      dimensions.map((d) => [d, (row[d] as string | number | null) ?? null])
    );
    const key = encodeCoord(coord);
    if (!groups.has(key)) {
      groups.set(key, { coord, rows: [] });
    }
    groups.get(key)!.rows.push(row);
  }

  return groups;
}

/**
 * Execute an OlapQuery against an in-memory array of fact rows.
 * Measures must be resolved from the cube definition before calling.
 */
export function executeQuery(
  query: OlapQuery,
  factRows: readonly FactRow[],
  measures: ReadonlyMap<string, Measure>
): Result<QueryResult, InvalidQueryError> {
  const parsed = OlapQuerySchema.safeParse(query);
  if (!parsed.success) {
    return err(new InvalidQueryError(parsed.error.message));
  }

  const q = parsed.data;
  const start = Date.now();

  // Validate requested measures exist.
  for (const name of q.measures) {
    if (!measures.has(name)) {
      return err(new InvalidQueryError(`unknown measure: ${name}`));
    }
  }

  // Apply filters.
  const filtered = factRows.filter((row) =>
    q.filters.every((f) => evalFilter(row, f))
  );

  // Group by dimensions.
  const groups = groupByDimensions(filtered, q.dimensions);

  // Aggregate measures per group.
  const allRows: QueryResultRow[] = [];
  for (const { coord, rows: groupRows } of groups.values()) {
    const values: Record<string, CellValue> = {};
    for (const mName of q.measures) {
      const measure = measures.get(mName)!;
      const nums = groupRows
        .map((r) => r[measure.column])
        .filter((v): v is number => typeof v === "number");
      const raw = aggregate(measure.aggregation, nums);
      values[mName] = { raw, formatted: formatMeasure(raw, measure) };
    }
    allRows.push({ coord, values });
  }

  // Sort.
  const sorted = [...allRows].sort((a, b) => {
    for (const s of q.sort) {
      const av = a.values[s.field]?.raw ?? a.coord[s.field] ?? null;
      const bv = b.values[s.field]?.raw ?? b.coord[s.field] ?? null;
      if (av === bv) continue;
      if (av === null) return 1;
      if (bv === null) return -1;
      const cmp = av < bv ? -1 : 1;
      return s.direction === "asc" ? cmp : -cmp;
    }
    return 0;
  });

  const totalRows = sorted.length;
  const paginated = q.limit !== undefined
    ? sorted.slice(q.offset, q.offset + q.limit)
    : sorted.slice(q.offset);

  return ok({
    rows: paginated,
    totalRows,
    executionMs: Date.now() - start,
    query: q,
  });
}

/** Parse and validate a raw query object, returning typed OlapQuery. */
export function parseQuery(raw: unknown): Result<OlapQuery, InvalidQueryError> {
  const parsed = OlapQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return err(new InvalidQueryError(parsed.error.message));
  }
  return ok(parsed.data);
}
