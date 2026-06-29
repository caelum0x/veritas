// Query planner — converts a SelectQuery AST into a physical execution plan.
import { ok, type Result } from "@veritas/core";
import type { SelectQuery, Predicate, ScalarExpr, ProjectionItem, JoinClause, OrderByItem } from "./query.js";

// ── Plan node types ──────────────────────────────────────────────────────────

export interface ScanNode {
  readonly kind: "scan";
  readonly schema: string;
  readonly table: string;
  readonly alias?: string;
}

export interface FilterNode {
  readonly kind: "filter";
  readonly source: PlanNode;
  readonly predicate: Predicate;
}

export interface ProjectNode {
  readonly kind: "project";
  readonly source: PlanNode;
  readonly items: readonly ProjectionItem[];
}

export interface JoinNode {
  readonly kind: "join";
  readonly joinType: "inner" | "left" | "right" | "full";
  readonly left: PlanNode;
  readonly right: PlanNode;
  readonly on: Predicate;
}

export interface AggregateNode {
  readonly kind: "aggregate";
  readonly source: PlanNode;
  readonly groupBy: readonly ScalarExpr[];
  readonly projections: readonly ProjectionItem[];
  readonly having?: Predicate;
}

export interface SortNode {
  readonly kind: "sort";
  readonly source: PlanNode;
  readonly orderBy: readonly OrderByItem[];
}

export interface LimitNode {
  readonly kind: "limit";
  readonly source: PlanNode;
  readonly limit: number;
  readonly offset: number;
}

export type PlanNode =
  | ScanNode
  | FilterNode
  | ProjectNode
  | JoinNode
  | AggregateNode
  | SortNode
  | LimitNode;

export interface QueryPlan {
  readonly root: PlanNode;
  readonly estimatedRows?: number;
}

// ── Planner ──────────────────────────────────────────────────────────────────

function hasAggregation(items: readonly ProjectionItem[]): boolean {
  return items.some(i => i.expr.kind === "agg");
}

function buildJoinTree(base: PlanNode, joins: readonly JoinClause[]): PlanNode {
  return joins.reduce<PlanNode>((left, j) => {
    const right: ScanNode = { kind: "scan", schema: j.right.schema, table: j.right.name, alias: j.right.alias };
    return { kind: "join", joinType: j.joinType, left, right, on: j.on };
  }, base);
}

/** Produce a QueryPlan from a validated SelectQuery. */
export function plan(query: SelectQuery): Result<QueryPlan> {
  // Start with a scan of the primary table
  let node: PlanNode = {
    kind: "scan",
    schema: query.from.schema,
    table: query.from.name,
    alias: query.from.alias,
  };

  // JOIN nodes
  if (query.joins.length > 0) {
    node = buildJoinTree(node, query.joins);
  }

  // WHERE filter
  if (query.where) {
    node = { kind: "filter", source: node, predicate: query.where };
  }

  // GROUP BY / aggregation or plain projection
  if (query.groupBy.length > 0 || hasAggregation(query.projections)) {
    node = {
      kind: "aggregate",
      source: node,
      groupBy: query.groupBy,
      projections: query.projections,
      having: query.having,
    };
  } else if (query.projections.length > 0) {
    node = { kind: "project", source: node, items: query.projections };
  }

  // ORDER BY
  if (query.orderBy.length > 0) {
    node = { kind: "sort", source: node, orderBy: query.orderBy };
  }

  // LIMIT / OFFSET
  if (query.limit !== undefined || query.offset !== undefined) {
    node = {
      kind: "limit",
      source: node,
      limit: query.limit ?? Number.MAX_SAFE_INTEGER,
      offset: query.offset ?? 0,
    };
  }

  return ok({ root: node });
}
