// Shared value types for the metrics-layer: primitives, filter ops, and result shapes.
import { z } from "zod";

/** Scalar value that can appear in a metric row. */
export type MetricScalar = string | number | boolean | null;

/** A row of metric data keyed by column name. */
export type MetricRow = Readonly<Record<string, MetricScalar>>;

/** Supported filter operators for metric queries. */
export type FilterOp = "eq" | "neq" | "lt" | "lte" | "gt" | "gte" | "in" | "not_in" | "like";

export const FilterOpSchema = z.enum(["eq", "neq", "lt", "lte", "gt", "gte", "in", "not_in", "like"]);

/** A single dimension filter applied to a metric query. */
export interface MetricFilter {
  readonly dimension: string;
  readonly op: FilterOp;
  readonly value: MetricScalar | readonly MetricScalar[];
}

export const MetricFilterSchema = z.object({
  dimension: z.string().min(1),
  op: FilterOpSchema,
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])),
  ]),
});

/** Sort direction for metric result ordering. */
export type SortDirection = "asc" | "desc";

export const SortDirectionSchema = z.enum(["asc", "desc"]);

/** Sort spec for a metric query result. */
export interface MetricSort {
  readonly column: string;
  readonly direction: SortDirection;
}

export const MetricSortSchema = z.object({
  column: z.string().min(1),
  direction: SortDirectionSchema,
});

/** Pagination parameters for a metric query. */
export interface MetricPagination {
  readonly limit: number;
  readonly offset: number;
}

export const MetricPaginationSchema = z.object({
  limit: z.number().int().min(1).max(10_000).default(100),
  offset: z.number().int().min(0).default(0),
});

/** A fully resolved metric query result. */
export interface MetricResult {
  readonly metricName: string;
  readonly rows: readonly MetricRow[];
  readonly totalRows: number;
  readonly executedAt: string;
  readonly durationMs: number;
}

/** Runtime scalar type tag. */
export type ScalarType = "string" | "number" | "boolean" | "timestamp";

export const ScalarTypeSchema = z.enum(["string", "number", "boolean", "timestamp"]);
