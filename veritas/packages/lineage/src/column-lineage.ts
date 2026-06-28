// Column-level lineage: track and query which columns flow into or from a specific column.
import { Result, ok, err } from "@veritas/core";
import { ColumnRef, ColumnEdge, ColumnLineageMap, NodeId } from "./types.js";
import { ColumnLineageNotFoundError } from "./errors.js";

export interface ColumnLineageStore {
  readonly edges: ReadonlyArray<ColumnEdge>;
}

function makeKey(ref: ColumnRef): string {
  return `${ref.nodeId}::${ref.column}`;
}

function buildUpstreamIndex(edges: ReadonlyArray<ColumnEdge>): Map<string, ColumnRef[]> {
  const index = new Map<string, ColumnRef[]>();
  for (const edge of edges) {
    const toKey = makeKey(edge.to);
    const existing = index.get(toKey) ?? [];
    index.set(toKey, [...existing, edge.from]);
  }
  return index;
}

function buildDownstreamIndex(edges: ReadonlyArray<ColumnEdge>): Map<string, ColumnRef[]> {
  const index = new Map<string, ColumnRef[]>();
  for (const edge of edges) {
    const fromKey = makeKey(edge.from);
    const existing = index.get(fromKey) ?? [];
    index.set(fromKey, [...existing, edge.to]);
  }
  return index;
}

function buildExpressionIndex(
  edges: ReadonlyArray<ColumnEdge>,
): Map<string, Array<{ from: ColumnRef; expression?: string }>> {
  const index = new Map<string, Array<{ from: ColumnRef; expression?: string }>>();
  for (const edge of edges) {
    const toKey = makeKey(edge.to);
    const existing = index.get(toKey) ?? [];
    index.set(toKey, [...existing, { from: edge.from, expression: edge.expression }]);
  }
  return index;
}

export function resolveColumnLineage(
  store: ColumnLineageStore,
  ref: ColumnRef,
): Result<ColumnLineageMap, ColumnLineageNotFoundError> {
  const upstreamIndex = buildUpstreamIndex(store.edges);
  const downstreamIndex = buildDownstreamIndex(store.edges);
  const expressionIndex = buildExpressionIndex(store.edges);

  const key = makeKey(ref);
  const upstreamColumns = upstreamIndex.get(key) ?? [];
  const downstreamColumns = downstreamIndex.get(key) ?? [];
  const expressions = expressionIndex.get(key) ?? [];

  const hasAnyRelation = upstreamColumns.length > 0 || downstreamColumns.length > 0;
  const isKnownOrigin = store.edges.some((e) => makeKey(e.from) === key);

  if (!hasAnyRelation && !isKnownOrigin) {
    return err(new ColumnLineageNotFoundError(ref.nodeId, ref.column));
  }

  return ok({
    nodeId: ref.nodeId,
    column: ref.column,
    upstreamColumns,
    downstreamColumns,
    expressions,
  });
}

export function addColumnEdge(
  store: ColumnLineageStore,
  edge: ColumnEdge,
): ColumnLineageStore {
  return { edges: [...store.edges, edge] };
}

export function removeColumnEdges(
  store: ColumnLineageStore,
  nodeId: NodeId,
): ColumnLineageStore {
  return {
    edges: store.edges.filter(
      (e) => e.from.nodeId !== nodeId && e.to.nodeId !== nodeId,
    ),
  };
}

export function createColumnLineageStore(): ColumnLineageStore {
  return { edges: [] };
}
