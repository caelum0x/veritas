// Shared primitive types for the warehouse module.
import { z } from "zod";

export const ColumnTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "timestamp",
  "json",
  "uuid",
]);
export type ColumnType = z.infer<typeof ColumnTypeSchema>;

export const AggregationSchema = z.enum([
  "sum",
  "count",
  "avg",
  "min",
  "max",
  "count_distinct",
]);
export type Aggregation = z.infer<typeof AggregationSchema>;

export const SortDirectionSchema = z.enum(["asc", "desc"]);
export type SortDirection = z.infer<typeof SortDirectionSchema>;

export const PartitionStrategySchema = z.enum(["range", "list", "hash", "none"]);
export type PartitionStrategy = z.infer<typeof PartitionStrategySchema>;

export const TableKindSchema = z.enum(["fact", "dimension", "staging"]);
export type TableKind = z.infer<typeof TableKindSchema>;

export interface ColumnDef {
  readonly name: string;
  readonly type: ColumnType;
  readonly nullable: boolean;
  readonly primaryKey: boolean;
  readonly description?: string;
}

export interface TableRef {
  readonly schema: string;
  readonly name: string;
}

export type RowRecord = Readonly<Record<string, unknown>>;

export interface QueryFilter {
  readonly column: string;
  readonly op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "like";
  readonly value: unknown;
}

export interface QuerySort {
  readonly column: string;
  readonly direction: SortDirection;
}

export interface QueryOptions {
  readonly filters?: readonly QueryFilter[];
  readonly sort?: readonly QuerySort[];
  readonly limit?: number;
  readonly offset?: number;
  readonly columns?: readonly string[];
}

export interface QueryResult {
  readonly rows: readonly RowRecord[];
  readonly totalRows: number;
  readonly executionMs: number;
}

export interface LoadResult {
  readonly inserted: number;
  readonly failed: number;
  readonly errors: readonly string[];
}
