// Executor — walks a QueryPlan and produces a ResultSet using a DataWarehouse.
import { ok, err, isOk, type Result } from "@veritas/core";
import type { RowRecord, QueryOptions, QueryResult } from "@veritas/warehouse";
import type { QueryPlan, PlanNode } from "./planner.js";

/** Minimal warehouse port required by the executor. */
export interface DataWarehouse {
  query(schema: string, name: string, options?: QueryOptions): Promise<Result<QueryResult>>;
}
import type { Predicate, ScalarExpr, ProjectionItem } from "./query.js";

export interface ExecutionResult {
  readonly rows: readonly RowRecord[];
  readonly totalRows: number;
  readonly executionMs: number;
}

// ── Expression evaluation ────────────────────────────────────────────────────

function evalScalar(expr: ScalarExpr, row: RowRecord): unknown {
  if (expr.kind === "literal") return expr.value;
  if (expr.kind === "column") {
    if (expr.name === "*") return row;
    return expr.table ? (row[`${expr.table}.${expr.name}`] ?? row[expr.name]) : row[expr.name];
  }
  // agg is handled in aggregate node — fall back to null here
  return null;
}

function evalPredicate(pred: Predicate, row: RowRecord): boolean {
  if (pred.kind === "logical") {
    if (pred.op === "not") return !evalPredicate(pred.operands[0]!, row);
    if (pred.op === "and") return pred.operands.every(p => evalPredicate(p, row));
    return pred.operands.some(p => evalPredicate(p, row));
  }

  const l = evalScalar(pred.left, row);
  const r = evalScalar(pred.right, row);

  switch (pred.op) {
    case "eq": return l === r;
    case "neq": return l !== r;
    case "gt": return (l as number) > (r as number);
    case "gte": return (l as number) >= (r as number);
    case "lt": return (l as number) < (r as number);
    case "lte": return (l as number) <= (r as number);
    case "in": return Array.isArray(r) ? r.includes(l) : false;
    case "like": {
      const pattern = String(r).replace(/%/g, ".*").replace(/_/g, ".");
      return new RegExp(`^${pattern}$`, "i").test(String(l));
    }
  }
}

function applyProjection(items: readonly ProjectionItem[], row: RowRecord): RowRecord {
  if (items.length === 0) return row;
  const out: Record<string, unknown> = {};
  for (const item of items) {
    const key = item.alias ?? (item.expr.kind === "column" ? item.expr.name : "expr");
    out[key] = evalScalar(item.expr, row);
  }
  return out;
}

// ── Aggregation helpers ──────────────────────────────────────────────────────

type AggAccum = { sum: number; count: number; min: number; max: number; vals: unknown[] };

function initAccum(): AggAccum {
  return { sum: 0, count: 0, min: Infinity, max: -Infinity, vals: [] };
}

function updateAccum(acc: AggAccum, v: unknown): AggAccum {
  const n = typeof v === "number" ? v : 0;
  return {
    sum: acc.sum + n,
    count: acc.count + 1,
    min: n < acc.min ? n : acc.min,
    max: n > acc.max ? n : acc.max,
    vals: [...acc.vals, v],
  };
}

function finalizeAccum(fn: string, acc: AggAccum): number {
  switch (fn) {
    case "sum": return acc.sum;
    case "count": return acc.count;
    case "avg": return acc.count > 0 ? acc.sum / acc.count : 0;
    case "min": return acc.min === Infinity ? 0 : acc.min;
    case "max": return acc.max === -Infinity ? 0 : acc.max;
    case "count_distinct": return new Set(acc.vals).size;
    default: return 0;
  }
}

// ── Plan node execution ──────────────────────────────────────────────────────

async function executeNode(node: PlanNode, wh: DataWarehouse): Promise<Result<readonly RowRecord[]>> {
  if (node.kind === "scan") {
    const r = await wh.query(node.schema, node.table, {});
    if (!isOk(r)) return r as Result<readonly RowRecord[]>;
    return ok(r.value.rows);
  }

  if (node.kind === "filter") {
    const src = await executeNode(node.source, wh);
    if (!isOk(src)) return src;
    return ok(src.value.filter(row => evalPredicate(node.predicate, row)));
  }

  if (node.kind === "project") {
    const src = await executeNode(node.source, wh);
    if (!isOk(src)) return src;
    return ok(src.value.map(row => applyProjection(node.items, row)));
  }

  if (node.kind === "join") {
    const leftR = await executeNode(node.left, wh);
    if (!isOk(leftR)) return leftR;
    const rightR = await executeNode(node.right, wh);
    if (!isOk(rightR)) return rightR;

    const joined: RowRecord[] = [];
    for (const l of leftR.value) {
      let matched = false;
      for (const r of rightR.value) {
        const combined: RowRecord = { ...l, ...r };
        if (evalPredicate(node.on, combined)) { joined.push(combined); matched = true; }
      }
      if (!matched && (node.joinType === "left" || node.joinType === "full")) joined.push(l);
    }
    if (node.joinType === "right" || node.joinType === "full") {
      for (const r of rightR.value) {
        const alreadyJoined = joined.some(j => Object.keys(r).every(k => j[k] === r[k]));
        if (!alreadyJoined) joined.push(r);
      }
    }
    return ok(joined);
  }

  if (node.kind === "aggregate") {
    const src = await executeNode(node.source, wh);
    if (!isOk(src)) return src;

    const groups = new Map<string, { key: RowRecord; accums: Map<string, AggAccum> }>();
    for (const row of src.value) {
      const keyObj: Record<string, unknown> = {};
      for (const g of node.groupBy) {
        if (g.kind === "column") keyObj[g.name] = row[g.name];
      }
      const keyStr = JSON.stringify(keyObj);
      if (!groups.has(keyStr)) groups.set(keyStr, { key: keyObj, accums: new Map() });
      const grp = groups.get(keyStr)!;

      for (const item of node.projections) {
        if (item.expr.kind === "agg") {
          const alias = item.alias ?? item.expr.fn;
          if (!grp.accums.has(alias)) grp.accums.set(alias, initAccum());
          const v = evalScalar(item.expr.column, row);
          grp.accums.set(alias, updateAccum(grp.accums.get(alias)!, v));
        }
      }
    }

    // If no groups (no GROUP BY), treat entire result set as one group
    if (groups.size === 0 && src.value.length > 0) {
      const keyStr = "__all__";
      groups.set(keyStr, { key: {}, accums: new Map() });
      const grp = groups.get(keyStr)!;
      for (const row of src.value) {
        for (const item of node.projections) {
          if (item.expr.kind === "agg") {
            const alias = item.alias ?? item.expr.fn;
            if (!grp.accums.has(alias)) grp.accums.set(alias, initAccum());
            grp.accums.set(alias, updateAccum(grp.accums.get(alias)!, evalScalar(item.expr.column, row)));
          }
        }
      }
    }

    const rows: RowRecord[] = [];
    for (const { key, accums } of groups.values()) {
      const out: Record<string, unknown> = { ...key };
      for (const item of node.projections) {
        if (item.expr.kind === "agg") {
          const alias = item.alias ?? item.expr.fn;
          out[alias] = finalizeAccum(item.expr.fn, accums.get(alias) ?? initAccum());
        } else if (item.expr.kind === "column") {
          out[item.alias ?? item.expr.name] = key[item.expr.name];
        }
      }
      const outRow: RowRecord = out;
      if (!node.having || evalPredicate(node.having, outRow)) rows.push(outRow);
    }
    return ok(rows);
  }

  if (node.kind === "sort") {
    const src = await executeNode(node.source, wh);
    if (!isOk(src)) return src;
    const sorted = [...src.value].sort((a, b) => {
      for (const o of node.orderBy) {
        const av = evalScalar(o.expr, a);
        const bv = evalScalar(o.expr, b);
        const cmp = av === bv ? 0 : av! < bv! ? -1 : 1;
        if (cmp !== 0) return o.dir === "asc" ? cmp : -cmp;
      }
      return 0;
    });
    return ok(sorted);
  }

  if (node.kind === "limit") {
    const src = await executeNode(node.source, wh);
    if (!isOk(src)) return src;
    return ok(src.value.slice(node.offset, node.offset + node.limit));
  }

  return err(new Error(`Unknown plan node kind: ${(node as PlanNode).kind}`));
}

/** Execute a QueryPlan against the given DataWarehouse and return an ExecutionResult. */
export async function execute(plan: QueryPlan, warehouse: DataWarehouse): Promise<Result<ExecutionResult>> {
  const start = Date.now();
  const r = await executeNode(plan.root, warehouse);
  if (!isOk(r)) return r as Result<ExecutionResult>;
  return ok({
    rows: r.value,
    totalRows: r.value.length,
    executionMs: Date.now() - start,
  });
}
