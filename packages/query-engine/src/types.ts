// Shared types for the query-engine: execution context, plan nodes, and engine config.
import type { RowRecord, QueryFilter, QuerySort } from "@veritas/warehouse";
import type { SelectQuery } from "./query.js";

/** A named data source available to the engine during execution. */
export interface DataSource {
  readonly schema: string;
  readonly name: string;
  readonly rows: readonly RowRecord[];
}

/** Registry mapping "schema.table" keys to their DataSource. */
export type DataSourceRegistry = ReadonlyMap<string, DataSource>;

/** Execution context passed through each stage of query evaluation. */
export interface ExecutionContext {
  readonly registry: DataSourceRegistry;
  readonly timeoutMs: number;
  readonly startedAt: number;
}

/** A resolved plan node ready for execution. */
export type PlanNodeKind = "scan" | "filter" | "project" | "join" | "aggregate" | "sort" | "limit";

export interface ScanNode {
  readonly kind: "scan";
  readonly schema: string;
  readonly table: string;
}

export interface FilterNode {
  readonly kind: "filter";
  readonly filters: readonly QueryFilter[];
  readonly child: PlanNode;
}

export interface ProjectNode {
  readonly kind: "project";
  readonly columns: readonly string[];
  readonly child: PlanNode;
}

export interface JoinNode {
  readonly kind: "join";
  readonly joinType: "inner" | "left" | "right" | "full";
  readonly left: PlanNode;
  readonly right: PlanNode;
  readonly leftKey: string;
  readonly rightKey: string;
}

export interface AggregateNode {
  readonly kind: "aggregate";
  readonly groupBy: readonly string[];
  readonly aggregations: readonly AggregationSpec[];
  readonly child: PlanNode;
}

export interface AggregationSpec {
  readonly fn: "sum" | "count" | "avg" | "min" | "max" | "count_distinct";
  readonly column: string;
  readonly alias: string;
}

export interface SortNode {
  readonly kind: "sort";
  readonly sorts: readonly QuerySort[];
  readonly child: PlanNode;
}

export interface LimitNode {
  readonly kind: "limit";
  readonly limit: number;
  readonly offset: number;
  readonly child: PlanNode;
}

export type PlanNode =
  | ScanNode
  | FilterNode
  | ProjectNode
  | JoinNode
  | AggregateNode
  | SortNode
  | LimitNode;

/** Full execution plan produced by the planner. */
export interface QueryPlan {
  readonly query: SelectQuery;
  readonly root: PlanNode;
  readonly estimatedRows: number;
}

/** Engine-level configuration. */
export interface QueryEngineConfig {
  readonly defaultTimeoutMs: number;
  readonly maxRows: number;
}

export const DEFAULT_ENGINE_CONFIG: QueryEngineConfig = {
  defaultTimeoutMs: 30_000,
  maxRows: 100_000,
};
