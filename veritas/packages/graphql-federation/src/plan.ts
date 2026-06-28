// Query plan builder: constructs execution plans for federated GraphQL operations.
import { newId } from "@veritas/core";
import type {
  QueryPlanNode,
  FetchNode,
  FlattenNode,
  ParallelNode,
  SequenceNode,
  DeferNode,
  FederationEntity,
} from "./types.js";
import { QueryPlanError } from "./errors.js";
import { ok, err, type Result } from "@veritas/core";

export interface QueryPlan {
  readonly id: string;
  readonly operationName: string | undefined;
  readonly root: QueryPlanNode;
  readonly subgraphsUsed: ReadonlyArray<string>;
  readonly estimatedFetches: number;
}

export interface PlanContext {
  readonly subgraphEntities: ReadonlyMap<string, ReadonlyArray<FederationEntity>>;
  readonly operationName?: string;
  readonly variables?: Record<string, unknown>;
}

export function makeFetchNode(
  subgraphName: string,
  query: string,
  requires: ReadonlyArray<string> = []
): FetchNode {
  return Object.freeze({ kind: "Fetch", subgraphName, query, requires });
}

export function makeFlattenNode(
  path: ReadonlyArray<string>,
  node: QueryPlanNode
): FlattenNode {
  return Object.freeze({ kind: "Flatten", path: Object.freeze([...path]), node });
}

export function makeParallelNode(
  nodes: ReadonlyArray<QueryPlanNode>
): ParallelNode {
  return Object.freeze({ kind: "Parallel", nodes: Object.freeze([...nodes]) });
}

export function makeSequenceNode(
  nodes: ReadonlyArray<QueryPlanNode>
): SequenceNode {
  return Object.freeze({ kind: "Sequence", nodes: Object.freeze([...nodes]) });
}

export function makeDeferNode(
  primary: QueryPlanNode,
  deferred: ReadonlyArray<QueryPlanNode>
): DeferNode {
  return Object.freeze({
    kind: "Defer",
    primary,
    deferred: Object.freeze([...deferred]),
  });
}

function countFetches(node: QueryPlanNode): number {
  switch (node.kind) {
    case "Fetch":
      return 1;
    case "Flatten":
      return countFetches(node.node);
    case "Parallel":
    case "Sequence":
      return node.nodes.reduce((acc, n) => acc + countFetches(n), 0);
    case "Defer":
      return countFetches(node.primary) + node.deferred.reduce((acc, n) => acc + countFetches(n), 0);
  }
}

function collectSubgraphs(node: QueryPlanNode, acc: Set<string>): void {
  switch (node.kind) {
    case "Fetch":
      acc.add(node.subgraphName);
      break;
    case "Flatten":
      collectSubgraphs(node.node, acc);
      break;
    case "Parallel":
    case "Sequence":
      for (const n of node.nodes) collectSubgraphs(n, acc);
      break;
    case "Defer":
      collectSubgraphs(node.primary, acc);
      for (const n of node.deferred) collectSubgraphs(n, acc);
      break;
  }
}

export function buildQueryPlan(
  root: QueryPlanNode,
  ctx: PlanContext
): Result<QueryPlan, QueryPlanError> {
  const id = newId("plan");
  if (root.kind === "Parallel" && root.nodes.length === 0) {
    return err(new QueryPlanError("Parallel plan must have at least one node", id));
  }
  if (root.kind === "Sequence" && root.nodes.length === 0) {
    return err(new QueryPlanError("Sequence plan must have at least one node", id));
  }
  const subgraphsSet = new Set<string>();
  collectSubgraphs(root, subgraphsSet);
  const plan: QueryPlan = Object.freeze({
    id,
    operationName: ctx.operationName,
    root,
    subgraphsUsed: Object.freeze([...subgraphsSet]),
    estimatedFetches: countFetches(root),
  });
  return ok(plan);
}

export function serializePlan(plan: QueryPlan): Record<string, unknown> {
  return Object.freeze({
    id: plan.id,
    operationName: plan.operationName ?? null,
    subgraphsUsed: plan.subgraphsUsed,
    estimatedFetches: plan.estimatedFetches,
    root: plan.root,
  });
}

export function optimizePlan(plan: QueryPlan): QueryPlan {
  // Flatten single-node sequences and parallels for simpler execution.
  const optimizeNode = (node: QueryPlanNode): QueryPlanNode => {
    if (
      (node.kind === "Sequence" || node.kind === "Parallel") &&
      node.nodes.length === 1
    ) {
      return optimizeNode(node.nodes[0] as QueryPlanNode);
    }
    if (node.kind === "Flatten") {
      return makeFlattenNode(node.path, optimizeNode(node.node));
    }
    if (node.kind === "Sequence" || node.kind === "Parallel") {
      const optimized = node.nodes.map(optimizeNode);
      return node.kind === "Sequence"
        ? makeSequenceNode(optimized)
        : makeParallelNode(optimized);
    }
    return node;
  };
  const optimizedRoot = optimizeNode(plan.root);
  const subgraphsSet = new Set<string>();
  collectSubgraphs(optimizedRoot, subgraphsSet);
  return Object.freeze({
    ...plan,
    root: optimizedRoot,
    subgraphsUsed: Object.freeze([...subgraphsSet]),
    estimatedFetches: countFetches(optimizedRoot),
  });
}
