// Query optimizer — applies rule-based rewrites to reduce a QueryPlan's cost.
import { ok, type Result } from "@veritas/core";
import type {
  PlanNode,
  QueryPlan,
  FilterNode,
  ProjectNode,
  SortNode,
  LimitNode,
  AggregateNode,
  JoinNode,
} from "./planner.js";

// ── Rewrite rules ─────────────────────────────────────────────────────────────

/** Push filter nodes below join nodes where possible (predicate push-down). */
function pushDownFilters(node: PlanNode): PlanNode {
  if (node.kind === "filter") {
    const inner = pushDownFilters(node.source);
    // If the inner node is a join, attempt to push down to the appropriate branch
    if (inner.kind === "join") {
      const pushed: JoinNode = {
        ...inner,
        left: { kind: "filter", source: inner.left, predicate: node.predicate },
      };
      return pushed;
    }
    return { ...node, source: inner };
  }

  if (node.kind === "join") {
    return { ...node, left: pushDownFilters(node.left), right: pushDownFilters(node.right) };
  }

  if ("source" in node && node.source !== undefined) {
    return { ...node, source: pushDownFilters((node as FilterNode | ProjectNode | SortNode | LimitNode | AggregateNode).source) } as PlanNode;
  }

  return node;
}

/** Eliminate redundant projections (e.g., project(*) over project(*) collapses). */
function eliminateRedundantProjections(node: PlanNode): PlanNode {
  if (node.kind === "project") {
    const inner = eliminateRedundantProjections(node.source);
    // star projection is a no-op wrapper — remove if inner is also a project or scan
    const isStar = node.items.length === 1 && node.items[0]!.expr.kind === "column" && node.items[0]!.expr.name === "*";
    if (isStar) return inner;
    return { ...node, source: inner };
  }

  if ("source" in node && node.source !== undefined) {
    return { ...node, source: eliminateRedundantProjections((node as FilterNode | ProjectNode | SortNode | LimitNode | AggregateNode).source) } as PlanNode;
  }

  if (node.kind === "join") {
    return { ...node, left: eliminateRedundantProjections(node.left), right: eliminateRedundantProjections(node.right) };
  }

  return node;
}

/** Move LIMIT node as close as possible to the scan (early stop). */
function pushDownLimits(node: PlanNode): PlanNode {
  if (node.kind === "limit") {
    const inner = pushDownLimits(node.source);
    // Only push limit below sort if there is no ordering dependency issue
    if (inner.kind === "sort") {
      // Keep limit above sort so ordering is correct, but push it into children
      return { ...node, source: { ...inner, source: pushDownLimits(inner.source) } };
    }
    return { ...node, source: inner };
  }

  if ("source" in node && node.source !== undefined) {
    return { ...node, source: pushDownLimits((node as FilterNode | ProjectNode | SortNode | LimitNode | AggregateNode).source) } as PlanNode;
  }

  if (node.kind === "join") {
    return { ...node, left: pushDownLimits(node.left), right: pushDownLimits(node.right) };
  }

  return node;
}

const RULES: ReadonlyArray<(n: PlanNode) => PlanNode> = [
  pushDownFilters,
  eliminateRedundantProjections,
  pushDownLimits,
];

/** Apply all optimization rules to the plan, returning an optimized QueryPlan. */
export function optimize(plan: QueryPlan): Result<QueryPlan> {
  const optimizedRoot = RULES.reduce<PlanNode>((node, rule) => rule(node), plan.root);
  return ok({ ...plan, root: optimizedRoot });
}
