// Lineage node creation and management within a data lineage graph.
import { newId } from "@veritas/core";
import { NodeId, NodeKind, LineageNode, nodeId } from "./types.js";

export interface CreateNodeInput {
  readonly kind: NodeKind;
  readonly label: string;
  readonly datasetId?: import("@veritas/data-catalog").DatasetId;
  readonly metadata?: Record<string, string>;
}

export function createNode(input: CreateNodeInput): LineageNode {
  return {
    id: nodeId(newId("node")),
    kind: input.kind,
    label: input.label,
    datasetId: input.datasetId,
    metadata: input.metadata ?? {},
    createdAt: new Date().toISOString(),
  };
}

export function withNodeMetadata(
  node: LineageNode,
  key: string,
  value: string
): LineageNode {
  return {
    ...node,
    metadata: { ...node.metadata, [key]: value },
  };
}

export function nodeMatches(node: LineageNode, kind: NodeKind): boolean {
  return node.kind === kind;
}

export function nodesById(
  nodes: ReadonlyArray<LineageNode>
): ReadonlyMap<NodeId, LineageNode> {
  const map = new Map<NodeId, LineageNode>();
  for (const node of nodes) {
    map.set(node.id, node);
  }
  return map;
}
