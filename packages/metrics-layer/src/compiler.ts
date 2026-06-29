// Compiler: translates a Metric + dimensions/filters into a SelectQuery AST.
import type { SelectQuery, TableSource, ProjectionItem, Predicate, ColumnRef, OrderByItem } from "@veritas/query-engine";
import { columnRef, literal, makeSelect } from "@veritas/query-engine";
import type { Metric } from "./metric.js";
import type { Dimension, DimensionFilter } from "./dimension.js";
import type { TimeGrain } from "./time-grain.js";
import { MetricCompilationError } from "./errors.js";

export interface CompileOptions {
  readonly metric: Metric;
  readonly dimensions: readonly Dimension[];
  readonly filters: readonly DimensionFilter[];
  readonly timeGrain?: TimeGrain;
  readonly timeColumn?: string;
  readonly limit?: number;
  readonly offset?: number;
}

export interface CompiledMetricQuery {
  readonly query: SelectQuery;
  readonly metricAlias: string;
}

function mapFilterOpToComparisonOp(op: DimensionFilter["op"]): "eq" | "neq" | "in" | "like" | "gt" | "gte" | "lt" | "lte" {
  // "in" is handled separately; return a valid ComparisonOp for single-value ops
  if (op === "in") return "in";
  return op as "eq" | "neq" | "like" | "gt" | "gte" | "lt" | "lte";
}

function buildDimensionPredicate(filter: DimensionFilter, dim: Dimension): Predicate {
  const col: ColumnRef = columnRef(dim.sourceColumn, dim.sourceTable);
  const val = filter.value;
  const op = mapFilterOpToComparisonOp(filter.op);
  if (Array.isArray(val)) {
    // in operator with multiple values: build OR chain
    const operands: Predicate[] = (val as readonly (string | number | boolean)[]).map((v) => ({
      kind: "comparison" as const,
      left: col,
      op: "eq" as const,
      right: literal(v),
    }));
    if (operands.length === 0) {
      return { kind: "comparison", left: col, op: "eq", right: literal(null) };
    }
    if (operands.length === 1) return operands[0]!;
    return { kind: "logical", op: "or", operands };
  }
  return {
    kind: "comparison",
    left: col,
    op,
    right: literal(val as string | number | boolean | null),
  };
}

function combinePredicate(existing: Predicate | undefined, next: Predicate): Predicate {
  if (!existing) return next;
  return { kind: "logical", op: "and", operands: [existing, next] };
}

/**
 * Compile a metric + dimensions/filters into an immutable SelectQuery.
 * Throws MetricCompilationError on invalid input.
 */
export function compileMetricQuery(opts: CompileOptions): CompiledMetricQuery {
  const { metric, dimensions, filters, timeGrain, timeColumn, limit, offset } = opts;

  const from: TableSource = {
    schema: "public",
    name: metric.sourceTable,
    alias: "m",
  };

  const metricAlias = "metric_value";
  const aggProjection: ProjectionItem = {
    expr: {
      kind: "agg",
      fn: metric.aggFn,
      column: metric.sourceColumn
        ? columnRef(metric.sourceColumn, "m")
        : { kind: "literal", value: 1 },
      alias: metricAlias,
    },
    alias: metricAlias,
  };

  const dimensionProjections: ProjectionItem[] = dimensions.map((dim) => ({
    expr: columnRef(dim.sourceColumn, dim.sourceTable === metric.sourceTable ? "m" : dim.sourceTable),
    alias: dim.id,
  }));

  const timeProjection: ProjectionItem | null =
    timeGrain && timeColumn
      ? {
          expr: columnRef(timeColumn, "m"),
          alias: `time_${timeGrain}`,
        }
      : null;

  const projections: readonly ProjectionItem[] = [
    ...(timeProjection ? [timeProjection] : []),
    ...dimensionProjections,
    aggProjection,
  ];

  if (projections.length === 0) {
    throw new MetricCompilationError(metric.id, "no projections could be derived");
  }

  // Build WHERE clause from filters
  let where: Predicate | undefined;
  for (const filter of filters) {
    const dim = dimensions.find((d) => d.id === filter.dimensionId);
    if (!dim) continue;
    const pred = buildDimensionPredicate(filter, dim);
    where = combinePredicate(where, pred);
  }

  // GROUP BY: dimension columns + optional time column
  const groupBy: ColumnRef[] = [
    ...(timeProjection ? [columnRef(timeColumn!, "m")] : []),
    ...dimensions.map((dim) =>
      columnRef(dim.sourceColumn, dim.sourceTable === metric.sourceTable ? "m" : dim.sourceTable)
    ),
  ];

  const orderBy: OrderByItem[] = groupBy.map((col) => ({ expr: col, dir: "asc" as const }));

  const base = makeSelect(from);
  const query: SelectQuery = {
    ...base,
    projections,
    where,
    groupBy,
    orderBy,
    ...(limit !== undefined ? { limit } : {}),
    ...(offset !== undefined ? { offset } : {}),
  };

  return { query, metricAlias };
}
