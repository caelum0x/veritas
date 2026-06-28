// Lineage edge creation linking two nodes in a directed lineage graph.
import { newId } from "@veritas/core";
import { EdgeId, EdgeKind, LineageEdge, NodeId, edgeId } from "./types.js";

export interface CreateEdgeInput {
  readonly fromNodeId: NodeId;
  readonly toNodeId: NodeId;
  readonly kind: EdgeKind;
  readonly transformationLogic?: string;
}

export function createEdge(input: CreateEdgeInput): LineageEdge {
  return {
    id: edgeId(newId("edge")),
    fromNodeId: input.fromNodeId,
    toNodeId: input.toNodeId,
    kind: input.kind,
    transformationLogic: input.transformationLogic,
    createdAt: new Date().toISOString(),
  };
}

export function edgesFrom(
  edges: ReadonlyArray<LineageEdge>,
  nodeId: NodeId
): ReadonlyArray<LineageEdge> {
  return edges.filter((e) => e.fromNodeId === nodeId);
}

export function edgesTo(
  edges: ReadonlyArray<LineageEdge>,
  nodeId: NodeId
): ReadonlyArray<LineageEdge> {
  return edges.filter((e) => e.toNodeId === nodeId);
}

export function edgesById(
  edges: ReadonlyArray<LineageEdge>
): ReadonlyMap<EdgeId, LineageEdge> {
  const map = new Map<EdgeId, LineageEdge>();
  for (const edge of edges) {
    map.set(edge.id, edge);
  }
  return map;
}

export function uniqueEdgeKey(fromNodeId: NodeId, toNodeId: NodeId): string {
  return `${fromNodeId}::${toNodeId}`;
}
