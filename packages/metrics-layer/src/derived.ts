// Derived metrics: metrics computed as expressions over other registered metrics.
import { z } from "zod";
import { ok, err, isOk } from "@veritas/core";
import type { Result } from "@veritas/core";
import { DerivedMetricCycleError, MetricNotFoundError } from "./errors.js";
import type { MetricRow, MetricScalar } from "./types.js";

/** Arithmetic expression node for derived metric formulas. */
export type DerivedExprKind =
  | { readonly kind: "metric_ref"; readonly metricId: string }
  | { readonly kind: "constant"; readonly value: number }
  | { readonly kind: "binary"; readonly op: "+" | "-" | "*" | "/"; readonly left: DerivedExpr; readonly right: DerivedExpr }
  | { readonly kind: "unary"; readonly op: "-"; readonly operand: DerivedExpr };

export type DerivedExpr = DerivedExprKind;

export const DerivedExprSchema: z.ZodType<DerivedExpr> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("metric_ref"), metricId: z.string().min(1) }),
    z.object({ kind: z.literal("constant"), value: z.number() }),
    z.object({
      kind: z.literal("binary"),
      op: z.enum(["+", "-", "*", "/"]),
      left: DerivedExprSchema,
      right: DerivedExprSchema,
    }),
    z.object({
      kind: z.literal("unary"),
      op: z.literal("-"),
      operand: DerivedExprSchema,
    }),
  ])
);

/** A metric defined as a formula over other metrics. */
export const DerivedMetricSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  /** Formula as an expression tree. */
  formula: DerivedExprSchema,
  /** Explicit list of referenced metric ids (must match formula refs). */
  dependsOn: z.array(z.string()).min(1),
  format: z.string().default(".2f"),
  tags: z.record(z.string()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type DerivedMetric = z.infer<typeof DerivedMetricSchema>;

export const CreateDerivedMetricSchema = DerivedMetricSchema.omit({ createdAt: true, updatedAt: true });
export type CreateDerivedMetric = z.infer<typeof CreateDerivedMetricSchema>;

/** Collect all metric_ref ids from an expression tree. */
export function collectMetricRefs(expr: DerivedExpr): readonly string[] {
  switch (expr.kind) {
    case "metric_ref":
      return [expr.metricId];
    case "constant":
      return [];
    case "binary":
      return [...collectMetricRefs(expr.left), ...collectMetricRefs(expr.right)];
    case "unary":
      return collectMetricRefs(expr.operand);
  }
}

/** Evaluate a derived expression given resolved metric values per row. */
export function evaluateDerivedExpr(
  expr: DerivedExpr,
  metricValues: Readonly<Record<string, number>>
): number {
  switch (expr.kind) {
    case "metric_ref":
      return metricValues[expr.metricId] ?? 0;
    case "constant":
      return expr.value;
    case "binary": {
      const l = evaluateDerivedExpr(expr.left, metricValues);
      const r = evaluateDerivedExpr(expr.right, metricValues);
      switch (expr.op) {
        case "+": return l + r;
        case "-": return l - r;
        case "*": return l * r;
        case "/": return r === 0 ? 0 : l / r;
      }
    }
    case "unary":
      return -evaluateDerivedExpr(expr.operand, metricValues);
  }
}

/** Topological sort to detect and report dependency cycles. */
export function topoSortDerived(
  derived: readonly DerivedMetric[]
): Result<readonly DerivedMetric[], DerivedMetricCycleError> {
  const idToMetric = new Map(derived.map((d) => [d.id, d]));
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const order: DerivedMetric[] = [];

  function visit(id: string, stack: readonly string[]): DerivedMetricCycleError | null {
    if (inStack.has(id)) {
      const cycleStart = stack.indexOf(id);
      return new DerivedMetricCycleError([...stack.slice(cycleStart), id]);
    }
    if (visited.has(id)) return null;

    const metric = idToMetric.get(id);
    if (!metric) return null; // base metric ref, not a derived

    inStack.add(id);
    for (const dep of metric.dependsOn) {
      const cycleErr = visit(dep, [...stack, id]);
      if (cycleErr) return cycleErr;
    }
    inStack.delete(id);
    visited.add(id);
    order.push(metric);
    return null;
  }

  for (const d of derived) {
    const cycleErr = visit(d.id, []);
    if (cycleErr) return err(cycleErr);
  }

  return ok(order);
}

/** Compute derived metric values row-by-row given resolved base metric rows. */
export function computeDerivedRows(
  metric: DerivedMetric,
  resolvedInputs: Readonly<Record<string, readonly MetricRow[]>>,
  groupByColumns: readonly string[]
): Result<readonly MetricRow[], MetricNotFoundError> {
  for (const dep of metric.dependsOn) {
    if (!resolvedInputs[dep]) {
      return err(new MetricNotFoundError(dep));
    }
  }

  // Index rows by group key for each dependency
  const makeKey = (row: MetricRow): string =>
    groupByColumns.map((c) => String(row[c] ?? "__null__")).join("|");

  const keyToInputs = new Map<string, Record<string, number>>();

  for (const dep of metric.dependsOn) {
    const rows = resolvedInputs[dep]!;
    for (const row of rows) {
      const key = makeKey(row);
      if (!keyToInputs.has(key)) keyToInputs.set(key, {});
      const valRaw = row["value"] ?? row[dep] ?? 0;
      keyToInputs.get(key)![dep] = typeof valRaw === "number" ? valRaw : 0;
    }
  }

  const resultRows: MetricRow[] = [];
  for (const [, metricValues] of keyToInputs) {
    const computed = evaluateDerivedExpr(metric.formula, metricValues);
    resultRows.push({ value: computed });
  }

  return ok(resultRows);
}
