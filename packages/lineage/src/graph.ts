// In-memory lineage graph store with node/edge management and cycle detection.
import { Result, ok, err, newId } from "@veritas/core";
import { LineageGraph, LineageNode, LineageEdge, GraphId, NodeId, graphId } from "./types.js";
import { createEdge, CreateEdgeInput, edgesFrom } from "./edge.js";
import { createNode, CreateNodeInput } from "./node.js";
import { CyclicLineageError, LineageGraphNotFoundError, LineageNodeNotFoundError } from "./errors.js";

export interface LineageGraphStore {
  getGraph(id: GraphId): Result<LineageGraph, LineageGraphNotFoundError>;
  createGraph(name: string): LineageGraph;
  addNode(graphId: GraphId, input: CreateNodeInput): Result<LineageNode, LineageGraphNotFoundError>;
  addEdge(gId: GraphId, input: CreateEdgeInput): Result<LineageEdge, LineageGraphNotFoundError | CyclicLineageError | LineageNodeNotFoundError>;
  listGraphs(): ReadonlyArray<LineageGraph>;
}

function hasCycle(
  nodes: ReadonlyArray<LineageNode>,
  edges: ReadonlyArray<LineageEdge>
): NodeId | undefined {
  const visited = new Set<NodeId>();
  const stack = new Set<NodeId>();

  function dfs(nodeId: NodeId): NodeId | undefined {
    visited.add(nodeId);
    stack.add(nodeId);
    for (const edge of edgesFrom(edges, nodeId)) {
      if (!visited.has(edge.toNodeId)) {
        const cycleNode = dfs(edge.toNodeId);
        if (cycleNode !== undefined) return cycleNode;
      } else if (stack.has(edge.toNodeId)) {
        return edge.toNodeId;
      }
    }
    stack.delete(nodeId);
    return undefined;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const cycleNode = dfs(node.id);
      if (cycleNode !== undefined) return cycleNode;
    }
  }
  return undefined;
}

export function createInMemoryGraphStore(): LineageGraphStore {
  const graphs = new Map<GraphId, LineageGraph>();

  return {
    createGraph(name: string): LineageGraph {
      const now = new Date().toISOString();
      const graph: LineageGraph = {
        id: graphId(newId("graph")),
        name,
        nodes: [],
        edges: [],
        createdAt: now,
        updatedAt: now,
      };
      graphs.set(graph.id, graph);
      return graph;
    },

    getGraph(id: GraphId): Result<LineageGraph, LineageGraphNotFoundError> {
      const graph = graphs.get(id);
      if (!graph) return err(new LineageGraphNotFoundError(id));
      return ok(graph);
    },

    addNode(gId: GraphId, input: CreateNodeInput): Result<LineageNode, LineageGraphNotFoundError> {
      const graph = graphs.get(gId);
      if (!graph) return err(new LineageGraphNotFoundError(gId));
      const node = createNode(input);
      const updated: LineageGraph = {
        ...graph,
        nodes: [...graph.nodes, node],
        updatedAt: new Date().toISOString(),
      };
      graphs.set(gId, updated);
      return ok(node);
    },

    addEdge(
      gId: GraphId,
      input: CreateEdgeInput
    ): Result<LineageEdge, LineageGraphNotFoundError | CyclicLineageError | LineageNodeNotFoundError> {
      const graph = graphs.get(gId);
      if (!graph) return err(new LineageGraphNotFoundError(gId));

      const fromExists = graph.nodes.some((n) => n.id === input.fromNodeId);
      const toExists = graph.nodes.some((n) => n.id === input.toNodeId);
      if (!fromExists) return err(new LineageNodeNotFoundError(input.fromNodeId));
      if (!toExists) return err(new LineageNodeNotFoundError(input.toNodeId));

      const edge = createEdge(input);
      const candidateEdges = [...graph.edges, edge];
      const cycleNode = hasCycle(graph.nodes, candidateEdges);
      if (cycleNode !== undefined) return err(new CyclicLineageError(cycleNode));

      const updated: LineageGraph = {
        ...graph,
        edges: candidateEdges,
        updatedAt: new Date().toISOString(),
      };
      graphs.set(gId, updated);
      return ok(edge);
    },

    listGraphs(): ReadonlyArray<LineageGraph> {
      return Array.from(graphs.values());
    },
  };
}
