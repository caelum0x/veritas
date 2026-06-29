// Graph query helpers: filter, traverse, and extract subgraphs from a CitationGraph.

import type { CitationGraph, GraphNode, GraphEdge, EdgeKind, NodeKind } from "./types.js";

/** Return all nodes matching the given kind. */
export function nodesByKind(graph: CitationGraph, kind: NodeKind): readonly GraphNode[] {
  const result: GraphNode[] = [];
  for (const node of graph.nodes.values()) {
    if (node.kind === kind) result.push(node);
  }
  return result;
}

/** Return all edges matching the given kind. */
export function edgesByKind(graph: CitationGraph, kind: EdgeKind): readonly GraphEdge[] {
  const result: GraphEdge[] = [];
  for (const edge of graph.edges.values()) {
    if (edge.kind === kind) result.push(edge);
  }
  return result;
}

/** Return all edges originating from a node. */
export function outgoingEdges(graph: CitationGraph, nodeId: string): readonly GraphEdge[] {
  const result: GraphEdge[] = [];
  for (const edge of graph.edges.values()) {
    if (edge.from === nodeId) result.push(edge);
  }
  return result;
}

/** Return all edges pointing to a node. */
export function incomingEdges(graph: CitationGraph, nodeId: string): readonly GraphEdge[] {
  const result: GraphEdge[] = [];
  for (const edge of graph.edges.values()) {
    if (edge.to === nodeId) result.push(edge);
  }
  return result;
}

/** BFS traversal from a start node; returns visited node ids in BFS order. */
export function bfsFrom(
  graph: CitationGraph,
  startId: string,
  direction: "forward" | "backward" = "forward",
): readonly string[] {
  const visited: string[] = [];
  const seen = new Set<string>();
  const queue: string[] = [startId];
  seen.add(startId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    visited.push(current);

    const neighbours =
      direction === "forward"
        ? graph.adjacency.get(current) ?? new Set<string>()
        : graph.reverseAdjacency.get(current) ?? new Set<string>();

    for (const neighbour of neighbours) {
      if (!seen.has(neighbour)) {
        seen.add(neighbour);
        queue.push(neighbour);
      }
    }
  }

  return visited;
}

/** DFS traversal from a start node; returns visited node ids in DFS order. */
export function dfsFrom(
  graph: CitationGraph,
  startId: string,
  direction: "forward" | "backward" = "forward",
): readonly string[] {
  const visited: string[] = [];
  const seen = new Set<string>();

  function visit(id: string): void {
    if (seen.has(id)) return;
    seen.add(id);
    visited.push(id);

    const neighbours =
      direction === "forward"
        ? graph.adjacency.get(id) ?? new Set<string>()
        : graph.reverseAdjacency.get(id) ?? new Set<string>();

    for (const neighbour of neighbours) {
      visit(neighbour);
    }
  }

  visit(startId);
  return visited;
}

/** Extract the subgraph induced by the given node ids. */
export function inducedSubgraph(
  graph: CitationGraph,
  nodeIds: ReadonlySet<string>,
): CitationGraph {
  const nodes = new Map<string, GraphNode>();
  for (const id of nodeIds) {
    const node = graph.nodes.get(id);
    if (node !== undefined) nodes.set(id, node);
  }

  const edges = new Map<string, GraphEdge>();
  const adjacency = new Map<string, Set<string>>();
  const reverseAdjacency = new Map<string, Set<string>>();

  for (const id of nodeIds) {
    adjacency.set(id, new Set());
    reverseAdjacency.set(id, new Set());
  }

  for (const edge of graph.edges.values()) {
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
      edges.set(edge.id, edge);
      adjacency.get(edge.from)!.add(edge.to);
      reverseAdjacency.get(edge.to)!.add(edge.from);
    }
  }

  return { nodes, edges, adjacency, reverseAdjacency };
}

/** Return nodes reachable from startId (inclusive) via forward traversal. */
export function reachableFrom(graph: CitationGraph, startId: string): CitationGraph {
  const reachable = new Set(bfsFrom(graph, startId, "forward"));
  return inducedSubgraph(graph, reachable);
}

/** Return nodes that can reach targetId (inclusive) via backward traversal. */
export function ancestorsOf(graph: CitationGraph, targetId: string): CitationGraph {
  const ancestors = new Set(bfsFrom(graph, targetId, "backward"));
  return inducedSubgraph(graph, ancestors);
}

/** Find all shortest paths (by hop count) between two nodes using BFS. */
export function shortestPaths(
  graph: CitationGraph,
  fromId: string,
  toId: string,
): readonly (readonly string[])[] {
  if (fromId === toId) return [[fromId]];

  const queue: Array<readonly string[]> = [[fromId]];
  const visited = new Set<string>([fromId]);
  const results: Array<readonly string[]> = [];
  let foundDepth: number | null = null;

  while (queue.length > 0) {
    const path = queue.shift()!;
    const last = path[path.length - 1]!;

    if (foundDepth !== null && path.length > foundDepth) break;

    const neighbours = graph.adjacency.get(last) ?? new Set<string>();
    for (const neighbour of neighbours) {
      const nextPath = [...path, neighbour];
      if (neighbour === toId) {
        foundDepth = nextPath.length;
        results.push(nextPath);
      } else if (!visited.has(neighbour)) {
        visited.add(neighbour);
        queue.push(nextPath);
      }
    }
  }

  return results;
}

/** Filter edges by minimum weight threshold. */
export function edgesAboveWeight(
  graph: CitationGraph,
  minWeight: number,
): readonly GraphEdge[] {
  const result: GraphEdge[] = [];
  for (const edge of graph.edges.values()) {
    if (edge.weight >= minWeight) result.push(edge);
  }
  return result;
}

/** Return all source node ids that directly cite a given claim. */
export function sourcesForClaim(graph: CitationGraph, claimId: string): readonly string[] {
  const sourceIds: string[] = [];
  for (const edge of graph.edges.values()) {
    if (edge.from === claimId && edge.kind === "cites") {
      sourceIds.push(edge.to);
    }
  }
  return sourceIds;
}

/** Return all claim node ids that cite a given source. */
export function claimsForSource(graph: CitationGraph, sourceId: string): readonly string[] {
  const claimIds: string[] = [];
  for (const edge of graph.edges.values()) {
    if (edge.to === sourceId && edge.kind === "cites") {
      claimIds.push(edge.from);
    }
  }
  return claimIds;
}
