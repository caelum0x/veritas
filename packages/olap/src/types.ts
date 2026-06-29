// Shared primitive types for the @veritas/olap module.
import { z } from "zod";
import type { RowRecord } from "@veritas/warehouse";

export const AggregationFnSchema = z.enum([
  "sum",
  "count",
  "avg",
  "min",
  "max",
  "count_distinct",
]);
export type AggregationFn = z.infer<typeof AggregationFnSchema>;

export const SortDirectionSchema = z.enum(["asc", "desc"]);
export type SortDirection = z.infer<typeof SortDirectionSchema>;

export const GranularitySchema = z.enum([
  "year",
  "quarter",
  "month",
  "week",
  "day",
  "hour",
  "minute",
]);
export type Granularity = z.infer<typeof GranularitySchema>;

/** A single cell in a pivot/result matrix. */
export interface CellValue {
  readonly raw: number | null;
  readonly formatted: string;
}

/** Coordinate into a multidimensional result set. */
export type CoordKey = string;

/** Map from a serialized coordinate key to a cell value. */
export type ResultMatrix = ReadonlyMap<CoordKey, CellValue>;

/** A named tuple of dimension member values identifying a cell location. */
export type DimensionCoord = Readonly<Record<string, string | number | null>>;

/** Encodes a DimensionCoord to a stable string key. */
export function encodeCoord(coord: DimensionCoord): CoordKey {
  return Object.keys(coord)
    .sort()
    .map((k) => `${k}=${JSON.stringify(coord[k])}`)
    .join("|");
}

// ── MDX-lite query types ──────────────────────────────────────────────────────

export const FilterOpSchema = z.enum([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "not_in",
  "like",
  "is_null",
  "is_not_null",
]);
export type FilterOp = z.infer<typeof FilterOpSchema>;

export const QueryFilterSchema = z.object({
  /** Dimension name to filter on. */
  dimension: z.string().min(1),
  op: FilterOpSchema,
  value: z.unknown(),
});
export type QueryFilter = z.infer<typeof QueryFilterSchema>;

export const QuerySortSchema = z.object({
  field: z.string().min(1),
  direction: SortDirectionSchema,
});
export type QuerySort = z.infer<typeof QuerySortSchema>;

export const OlapQuerySchema = z.object({
  /** Target cube name. */
  cube: z.string().min(1),
  dimensions: z.array(z.string()).default([]),
  measures: z.array(z.string()).min(1),
  filters: z.array(QueryFilterSchema).default([]),
  sort: z.array(QuerySortSchema).default([]),
  limit: z.number().int().positive().max(10_000).optional(),
  offset: z.number().int().nonnegative().optional(),
});
export type OlapQuery = z.infer<typeof OlapQuerySchema>;

// ── Result types ─────────────────────────────────────────────────────────────

export interface OlapCell {
  readonly dimensions: Readonly<Record<string, unknown>>;
  readonly measures: Readonly<Record<string, number | null>>;
}

export interface OlapResult {
  readonly cells: readonly OlapCell[];
  readonly totalCells: number;
  readonly executionMs: number;
  readonly query: OlapQuery;
}

// ── Drill / slice / pivot ─────────────────────────────────────────────────────

export const DrillDirectionSchema = z.enum(["down", "up"]);
export type DrillDirection = z.infer<typeof DrillDirectionSchema>;

export const DrillRequestSchema = z.object({
  query: OlapQuerySchema,
  dimension: z.string().min(1),
  direction: DrillDirectionSchema,
  value: z.unknown().optional(),
});
export type DrillRequest = z.infer<typeof DrillRequestSchema>;

export const SliceRequestSchema = z.object({
  query: OlapQuerySchema,
  dimension: z.string().min(1),
  value: z.unknown(),
});
export type SliceRequest = z.infer<typeof SliceRequestSchema>;

export const DiceRequestSchema = z.object({
  query: OlapQuerySchema,
  filters: z.array(QueryFilterSchema).min(1),
});
export type DiceRequest = z.infer<typeof DiceRequestSchema>;

export const PivotRequestSchema = z.object({
  query: OlapQuerySchema,
  rowDimensions: z.array(z.string()).min(1),
  colDimensions: z.array(z.string()).min(1),
  measure: z.string().min(1),
});
export type PivotRequest = z.infer<typeof PivotRequestSchema>;

export interface PivotTable {
  readonly rowKeys: readonly string[];
  readonly colKeys: readonly string[];
  readonly cells: Readonly<Record<string, Readonly<Record<string, number | null>>>>;
  readonly measure: string;
}

// ── Rollup / pre-aggregation ──────────────────────────────────────────────────

export const RollupDefinitionSchema = z.object({
  name: z.string().min(1),
  cube: z.string().min(1),
  dimensions: z.array(z.string()).default([]),
  measures: z.array(z.string()).min(1),
  granularity: GranularitySchema.optional(),
  timeDimension: z.string().optional(),
});
export type RollupDefinition = z.infer<typeof RollupDefinitionSchema>;

export interface RollupEntry {
  readonly definition: RollupDefinition;
  readonly rows: readonly RowRecord[];
  readonly builtAt: string;
}

// ── Port interface ────────────────────────────────────────────────────────────

export interface OlapWarehousePort {
  /** Scan all rows from a table, optionally projecting specific columns. */
  scanTable(table: string, columns?: readonly string[]): Promise<readonly RowRecord[]>;
}
