// Immutable citation/evidence graph with adjacency indices and mutation helpers.

import type { GraphNode, GraphEdge, CitationGraph } from "./types.js";
import { DuplicateNodeError, DuplicateEdgeError, GraphNodeNotFoundError } from "./errors.js";
import { ok, err, type Result } from "@veritas/core";

export function emptyGraph(): CitationGraph {
  return {
    nodes: new Map(),
    edges: new Map(),
    adjacency: new Map(),
    reverseAdjacency: new Map(),
  };
}

export function addNode(
  graph: CitationGraph,
  node: GraphNode,
): Result<CitationGraph, DuplicateNodeError> {
  if (graph.nodes.has(node.id)) {
    return err(new DuplicateNodeError(node.id));
  }
  const nodes = new Map(graph.nodes).set(node.id, node);
  const adjacency = new Map(graph.adjacency).set(node.id, new Set(graph.adjacency.get(node.id)));
  const reverseAdjacency = new Map(graph.reverseAdjacency).set(
    node.id,
    new Set(graph.reverseAdjacency.get(node.id)),
  );
  return ok({ ...graph, nodes, adjacency, reverseAdjacency });
}

export function addEdge(
  graph: CitationGraph,
  edge: GraphEdge,
): Result<CitationGraph, DuplicateEdgeError | GraphNodeNotFoundError> {
  if (graph.edges.has(edge.id)) {
    return err(new DuplicateEdgeError(edge.id));
  }
  if (!graph.nodes.has(edge.from)) {
    return err(new GraphNodeNotFoundError(edge.from));
  }
  if (!graph.nodes.has(edge.to)) {
    return err(new GraphNodeNotFoundError(edge.to));
  }
  const edges = new Map(graph.edges).set(edge.id, edge);
  const adjacency = new Map(graph.adjacency);
  const fromSet = new Set(adjacency.get(edge.from) ?? []);
  fromSet.add(edge.to);
  adjacency.set(edge.from, fromSet);
  const reverseAdjacency = new Map(graph.reverseAdjacency);
  const toSet = new Set(reverseAdjacency.get(edge.to) ?? []);
  toSet.add(edge.from);
  reverseAdjacency.set(edge.to, toSet);
  return ok({ ...graph, edges, adjacency, reverseAdjacency });
}

export function getNode(graph: CitationGraph, id: string): GraphNode | undefined {
  return graph.nodes.get(id);
}

export function getEdge(graph: CitationGraph, id: string): GraphEdge | undefined {
  return graph.edges.get(id);
}

export function getNeighbors(graph: CitationGraph, nodeId: string): ReadonlySet<string> {
  return graph.adjacency.get(nodeId) ?? new Set();
}

export function getPredecessors(graph: CitationGraph, nodeId: string): ReadonlySet<string> {
  return graph.reverseAdjacency.get(nodeId) ?? new Set();
}

export function nodeCount(graph: CitationGraph): number {
  return graph.nodes.size;
}

export function edgeCount(graph: CitationGraph): number {
  return graph.edges.size;
}

export function allNodes(graph: CitationGraph): readonly GraphNode[] {
  return Array.from(graph.nodes.values());
}

export function allEdges(graph: CitationGraph): readonly GraphEdge[] {
  return Array.from(graph.edges.values());
}

export function edgesBetween(
  graph: CitationGraph,
  fromId: string,
  toId: string,
): readonly GraphEdge[] {
  return Array.from(graph.edges.values()).filter(
    (e) => e.from === fromId && e.to === toId,
  );
}
