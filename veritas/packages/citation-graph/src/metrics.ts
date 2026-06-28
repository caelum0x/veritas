// Graph-level metrics: node/edge counts, density, support/refute ratios, and connectivity stats.

import type { CitationGraph, EdgeKind } from "./types.js";

export interface GraphMetrics {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly claimCount: number;
  readonly sourceCount: number;
  readonly evidenceCount: number;
  readonly density: number;
  readonly edgeKindCounts: Readonly<Record<EdgeKind, number>>;
  readonly supportRatio: number;
  readonly refuteRatio: number;
  readonly avgOutDegree: number;
  readonly maxOutDegree: number;
  readonly isolatedNodeCount: number;
}

/** Compute aggregate structural metrics for a CitationGraph. */
export function computeMetrics(graph: CitationGraph): GraphMetrics {
  let claimCount = 0;
  let sourceCount = 0;
  let evidenceCount = 0;

  for (const node of graph.nodes.values()) {
    if (node.kind === "claim") claimCount++;
    else if (node.kind === "source") sourceCount++;
    else if (node.kind === "evidence") evidenceCount++;
  }

  const nodeCount = graph.nodes.size;
  const edgeCount = graph.edges.size;

  // Density = actual edges / max possible edges in directed graph
  const maxEdges = nodeCount > 1 ? nodeCount * (nodeCount - 1) : 0;
  const density = maxEdges > 0 ? edgeCount / maxEdges : 0;

  const edgeKindCounts: Record<EdgeKind, number> = { cites: 0, supports: 0, refutes: 0, neutral: 0 };
  for (const edge of graph.edges.values()) {
    edgeKindCounts[edge.kind] = (edgeKindCounts[edge.kind] ?? 0) + 1;
  }

  const verdictalEdges = edgeKindCounts.supports + edgeKindCounts.refutes;
  const supportRatio = verdictalEdges > 0 ? edgeKindCounts.supports / verdictalEdges : 0;
  const refuteRatio = verdictalEdges > 0 ? edgeKindCounts.refutes / verdictalEdges : 0;

  // Out-degree stats
  let maxOutDegree = 0;
  let isolatedNodeCount = 0;

  for (const nodeId of graph.nodes.keys()) {
    const outNeighbours = graph.adjacency.get(nodeId);
    const outDeg = outNeighbours?.size ?? 0;
    const inNeighbours = graph.reverseAdjacency.get(nodeId);
    const inDeg = inNeighbours?.size ?? 0;
    if (outDeg > maxOutDegree) maxOutDegree = outDeg;
    if (outDeg === 0 && inDeg === 0) isolatedNodeCount++;
  }

  const avgOutDegree = nodeCount > 0 ? edgeCount / nodeCount : 0;

  return {
    nodeCount,
    edgeCount,
    claimCount,
    sourceCount,
    evidenceCount,
    density,
    edgeKindCounts,
    supportRatio,
    refuteRatio,
    avgOutDegree,
    maxOutDegree,
    isolatedNodeCount,
  };
}

/** Return a human-readable summary string of the metrics. */
export function formatMetrics(m: GraphMetrics): string {
  return [
    `Nodes: ${m.nodeCount} (claims=${m.claimCount}, sources=${m.sourceCount}, evidence=${m.evidenceCount})`,
    `Edges: ${m.edgeCount} (supports=${m.edgeKindCounts.supports}, refutes=${m.edgeKindCounts.refutes}, cites=${m.edgeKindCounts.cites}, neutral=${m.edgeKindCounts.neutral})`,
    `Density: ${(m.density * 100).toFixed(2)}%`,
    `Support ratio: ${(m.supportRatio * 100).toFixed(1)}% | Refute ratio: ${(m.refuteRatio * 100).toFixed(1)}%`,
    `Avg out-degree: ${m.avgOutDegree.toFixed(2)} | Max out-degree: ${m.maxOutDegree}`,
    `Isolated nodes: ${m.isolatedNodeCount}`,
  ].join("\n");
}
