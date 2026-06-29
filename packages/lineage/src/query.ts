// Lineage query engine: filter and slice lineage graphs by node kinds, edge kinds, and depth.
import { Result, ok, err } from "@veritas/core";
import {
  LineageGraph,
  LineageNode,
  LineageEdge,
  LineageQueryResult,
  LineageFilterOptions,
  NodeId,
} from "./types.js";
import { LineageNodeNotFoundError, InvalidLineageQueryError } from "./errors.js";

const DEFAULT_MAX_DEPTH = 20;

function reachableNodeIds(
  startId: NodeId,
  edges: ReadonlyArray<LineageEdge>,
  direction: "upstream" | "downstream",
  maxDepth: number,
): Set<string> {
  const visited = new Set<string>([startId]);
  const queue: Array<{ id: NodeId; depth: number }> = [{ id: startId, depth: 0 }];

  while (queue.length > 0) {
    const item = queue.shift();
    if (item === undefined) break;
    const { id, depth } = item;

    if (depth >= maxDepth) continue;

    for (const edge of edges) {
      const isMatch =
        direction === "downstream" ? edge.fromNodeId === id : edge.toNodeId === id;
      const nextId = direction === "downstream" ? edge.toNodeId : edge.fromNodeId;

      if (isMatch && !visited.has(nextId)) {
        visited.add(nextId);
        queue.push({ id: nextId, depth: depth + 1 });
      }
    }
  }

  return visited;
}

export function queryLineage(
  graph: LineageGraph,
  options: LineageFilterOptions = {},
): Result<LineageQueryResult, LineageNodeNotFoundError | InvalidLineageQueryError> {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;

  if (maxDepth < 0) {
    return err(new InvalidLineageQueryError("maxDepth must be non-negative"));
  }

  let filteredNodes: ReadonlyArray<LineageNode> = graph.nodes;
  let filteredEdges: ReadonlyArray<LineageEdge> = graph.edges;

  if (options.rootNodeId !== undefined) {
    const rootId = options.rootNodeId;
    const nodeExists = graph.nodes.some((n) => n.id === rootId);

    if (!nodeExists) {
      return err(new LineageNodeNotFoundError(rootId));
    }

    if (options.direction === undefined || options.direction === "both") {
      const upIds = reachableNodeIds(rootId, graph.edges, "upstream", maxDepth);
      const downIds = reachableNodeIds(rootId, graph.edges, "downstream", maxDepth);
      const allIds = new Set([...upIds, ...downIds]);
      filteredNodes = graph.nodes.filter((n) => allIds.has(n.id));
      filteredEdges = graph.edges.filter(
        (e) => allIds.has(e.fromNodeId) && allIds.has(e.toNodeId),
      );
    } else {
      const reachable = reachableNodeIds(rootId, graph.edges, options.direction, maxDepth);
      filteredNodes = graph.nodes.filter((n) => reachable.has(n.id));
      filteredEdges = graph.edges.filter(
        (e) => reachable.has(e.fromNodeId) && reachable.has(e.toNodeId),
      );
    }
  }

  if (options.nodeKinds !== undefined && options.nodeKinds.length > 0) {
    const kinds = options.nodeKinds;
    const allowedIds = new Set(filteredNodes.filter((n) => kinds.includes(n.kind)).map((n) => n.id));
    filteredNodes = filteredNodes.filter((n) => allowedIds.has(n.id));
    filteredEdges = filteredEdges.filter(
      (e) => allowedIds.has(e.fromNodeId) && allowedIds.has(e.toNodeId),
    );
  }

  if (options.edgeKinds !== undefined && options.edgeKinds.length > 0) {
    const edgeKinds = options.edgeKinds;
    filteredEdges = filteredEdges.filter((e) => edgeKinds.includes(e.kind));
    const connectedIds = new Set(
      filteredEdges.flatMap((e) => [e.fromNodeId, e.toNodeId]),
    );
    filteredNodes = filteredNodes.filter((n) => connectedIds.has(n.id) || n.id === options.rootNodeId);
  }

  return ok({
    nodes: filteredNodes,
    edges: filteredEdges,
    totalNodes: filteredNodes.length,
    totalEdges: filteredEdges.length,
  });
}

export function findNodesByLabel(
  graph: LineageGraph,
  label: string,
): ReadonlyArray<LineageNode> {
  const lower = label.toLowerCase();
  return graph.nodes.filter((n) => n.label.toLowerCase().includes(lower));
}

export function getEdgesBetween(
  graph: LineageGraph,
  fromId: NodeId,
  toId: NodeId,
): ReadonlyArray<LineageEdge> {
  return graph.edges.filter((e) => e.fromNodeId === fromId && e.toNodeId === toId);
}
