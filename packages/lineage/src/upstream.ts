// Upstream lineage resolution: traverses edges to find ancestor nodes of a given node.
import { Result, ok, err } from "@veritas/core";
import { LineageGraph, LineageNode, LineageEdge, NodeId, LineageQueryOptions } from "./types.js";
import { edgesTo } from "./edge.js";
import { nodesById } from "./node.js";
import { LineageNodeNotFoundError, LineageDepthExceededError } from "./errors.js";

const DEFAULT_MAX_DEPTH = 20;

export interface UpstreamResult {
  readonly rootNodeId: NodeId;
  readonly ancestors: ReadonlyArray<LineageNode>;
  readonly paths: ReadonlyArray<ReadonlyArray<NodeId>>;
  readonly depth: number;
}

export function resolveUpstream(
  graph: LineageGraph,
  startNodeId: NodeId,
  options: LineageQueryOptions = {}
): Result<UpstreamResult, LineageNodeNotFoundError | LineageDepthExceededError> {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const byId = nodesById(graph.nodes);

  if (!byId.has(startNodeId)) {
    return err(new LineageNodeNotFoundError(startNodeId));
  }

  const ancestors: LineageNode[] = [];
  const ancestorIds = new Set<NodeId>();
  const paths: NodeId[][] = [];

  function traverse(nodeId: NodeId, currentPath: ReadonlyArray<NodeId>, depth: number): boolean {
    if (depth > maxDepth) return false;

    const incoming = edgesTo(graph.edges, nodeId);
    for (const edge of incoming) {
      const parentId = edge.fromNodeId;
      const parent = byId.get(parentId);
      if (!parent) continue;

      if (options.kinds && !options.kinds.includes(parent.kind)) continue;

      const newPath = [...currentPath, parentId];

      if (!ancestorIds.has(parentId)) {
        ancestorIds.add(parentId);
        ancestors.push(parent);
      }

      paths.push(newPath);

      const ok = traverse(parentId, newPath, depth + 1);
      if (!ok) return false;
    }
    return true;
  }

  const success = traverse(startNodeId, [startNodeId], 0);
  if (!success) {
    return err(new LineageDepthExceededError(maxDepth));
  }

  const reachedDepth = paths.length > 0
    ? Math.max(...paths.map((p) => p.length - 1))
    : 0;

  return ok({
    rootNodeId: startNodeId,
    ancestors,
    paths,
    depth: reachedDepth,
  });
}

export function directParents(
  edges: ReadonlyArray<LineageEdge>,
  nodeId: NodeId
): ReadonlyArray<NodeId> {
  return edgesTo(edges, nodeId).map((e) => e.fromNodeId);
}
