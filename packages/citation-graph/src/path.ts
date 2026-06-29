// Evidence path finding: BFS shortest paths between nodes in a CitationGraph.

import type { CitationGraph, GraphEdge } from "./types.js";
import { GraphNodeNotFoundError } from "./errors.js";
import { err, ok, type Result } from "@veritas/core";

export interface PathStep {
  readonly nodeId: string;
  readonly edge: GraphEdge | null; // null for the start node
}

export interface EvidencePath {
  readonly steps: readonly PathStep[];
  readonly length: number;
  readonly nodeIds: readonly string[];
}

/** BFS to find shortest path from `fromId` to `toId`. Returns err if nodes not found or no path. */
export function findShortestPath(
  graph: CitationGraph,
  fromId: string,
  toId: string,
): Result<EvidencePath, GraphNodeNotFoundError | Error> {
  if (!graph.nodes.has(fromId)) {
    return err(new GraphNodeNotFoundError(fromId));
  }
  if (!graph.nodes.has(toId)) {
    return err(new GraphNodeNotFoundError(toId));
  }

  if (fromId === toId) {
    return ok({ steps: [{ nodeId: fromId, edge: null }], length: 0, nodeIds: [fromId] });
  }

  // BFS
  const visited = new Set<string>([fromId]);
  // Each queue entry: [nodeId, path so far]
  const queue: Array<{ nodeId: string; steps: PathStep[] }> = [
    { nodeId: fromId, steps: [{ nodeId: fromId, edge: null }] },
  ];

  // Build an edge lookup: from -> list of (to, edge)
  const edgeList = new Map<string, Array<{ to: string; edge: GraphEdge }>>();
  for (const edge of graph.edges.values()) {
    const existing = edgeList.get(edge.from);
    if (existing !== undefined) {
      existing.push({ to: edge.to, edge });
    } else {
      edgeList.set(edge.from, [{ to: edge.to, edge }]);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;

    const neighbours = edgeList.get(current.nodeId) ?? [];
    for (const { to, edge } of neighbours) {
      if (visited.has(to)) continue;
      visited.add(to);

      const nextSteps: PathStep[] = [...current.steps, { nodeId: to, edge }];

      if (to === toId) {
        const nodeIds = nextSteps.map((s) => s.nodeId);
        return ok({ steps: nextSteps, length: nextSteps.length - 1, nodeIds });
      }

      queue.push({ nodeId: to, steps: nextSteps });
    }
  }

  return err(new Error(`No path found from ${fromId} to ${toId}`));
}

/** Return all paths from `fromId` to `toId` up to `maxDepth` using DFS. */
export function findAllPaths(
  graph: CitationGraph,
  fromId: string,
  toId: string,
  maxDepth = 6,
): Result<readonly EvidencePath[], GraphNodeNotFoundError> {
  if (!graph.nodes.has(fromId)) {
    return err(new GraphNodeNotFoundError(fromId));
  }
  if (!graph.nodes.has(toId)) {
    return err(new GraphNodeNotFoundError(toId));
  }

  const edgeList = new Map<string, Array<{ to: string; edge: GraphEdge }>>();
  for (const edge of graph.edges.values()) {
    const existing = edgeList.get(edge.from);
    if (existing !== undefined) {
      existing.push({ to: edge.to, edge });
    } else {
      edgeList.set(edge.from, [{ to: edge.to, edge }]);
    }
  }

  const results: EvidencePath[] = [];

  function dfs(nodeId: string, steps: PathStep[], visited: Set<string>): void {
    if (steps.length - 1 >= maxDepth) return;
    for (const { to, edge } of edgeList.get(nodeId) ?? []) {
      if (visited.has(to)) continue;
      const nextSteps: PathStep[] = [...steps, { nodeId: to, edge }];
      if (to === toId) {
        results.push({ steps: nextSteps, length: nextSteps.length - 1, nodeIds: nextSteps.map((s) => s.nodeId) });
        continue;
      }
      const nextVisited = new Set(visited);
      nextVisited.add(to);
      dfs(to, nextSteps, nextVisited);
    }
  }

  dfs(fromId, [{ nodeId: fromId, edge: null }], new Set([fromId]));
  return ok(results);
}
