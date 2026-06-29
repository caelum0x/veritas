// Downstream impact resolution: find all nodes reachable from a given node following edge direction.
import { Result, ok, err } from "@veritas/core";
import {
  LineageNode,
  LineageEdge,
  LineageGraph,
  LineageQueryOptions,
  DownstreamResult,
  NodeId,
} from "./types.js";
import { LineageNodeNotFoundError, LineageDepthExceededError, CyclicLineageError } from "./errors.js";

const DEFAULT_MAX_DEPTH = 20;

function buildAdjacencyMap(edges: ReadonlyArray<LineageEdge>): Map<string, ReadonlyArray<NodeId>> {
  const map = new Map<string, NodeId[]>();
  for (const edge of edges) {
    const existing = map.get(edge.fromNodeId) ?? [];
    map.set(edge.fromNodeId, [...existing, edge.toNodeId]);
  }
  return map;
}

function collectDownstream(
  startId: NodeId,
  adjacency: Map<string, ReadonlyArray<NodeId>>,
  nodeMap: Map<string, LineageNode>,
  maxDepth: number,
): Result<{ nodes: LineageNode[]; paths: NodeId[][] }, LineageDepthExceededError | CyclicLineageError> {
  const visited = new Set<string>();
  const impactedNodes: LineageNode[] = [];
  const allPaths: NodeId[][] = [];

  function dfs(currentId: NodeId, currentPath: NodeId[], depth: number): Result<void, LineageDepthExceededError | CyclicLineageError> {
    if (depth > maxDepth) {
      return err(new LineageDepthExceededError(maxDepth));
    }
    if (currentPath.includes(currentId)) {
      return err(new CyclicLineageError(currentId));
    }

    const nextPath = [...currentPath, currentId];
    const neighbors = adjacency.get(currentId) ?? [];

    if (neighbors.length === 0 && nextPath.length > 1) {
      allPaths.push(nextPath);
    }

    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        const node = nodeMap.get(neighborId);
        if (node !== undefined) {
          impactedNodes.push(node);
        }
      }
      const result = dfs(neighborId, nextPath, depth + 1);
      if (!result.ok) return result;
    }

    return ok(undefined);
  }

  visited.add(startId);
  const result = dfs(startId, [], 0);
  if (!result.ok) return result;

  return ok({ nodes: impactedNodes, paths: allPaths });
}

export function resolveDownstream(
  graph: LineageGraph,
  rootNodeId: NodeId,
  options: LineageQueryOptions = {},
): Result<DownstreamResult, LineageNodeNotFoundError | LineageDepthExceededError | CyclicLineageError> {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const nodeMap = new Map<string, LineageNode>(graph.nodes.map((n) => [n.id, n]));

  if (!nodeMap.has(rootNodeId)) {
    return err(new LineageNodeNotFoundError(rootNodeId));
  }

  const filteredEdges = options.kinds !== undefined
    ? graph.edges.filter((e) => {
        const toNode = nodeMap.get(e.toNodeId);
        return toNode !== undefined && options.kinds!.includes(toNode.kind);
      })
    : graph.edges;

  const adjacency = buildAdjacencyMap(filteredEdges);
  const result = collectDownstream(rootNodeId, adjacency, nodeMap, maxDepth);

  if (!result.ok) return result;

  const { nodes, paths } = result.value;
  const maxActualDepth = paths.length > 0
    ? Math.max(...paths.map((p: NodeId[]) => p.length - 1))
    : 0;

  return ok({
    rootNodeId,
    impactedNodes: nodes,
    paths,
    depth: maxActualDepth,
  });
}
