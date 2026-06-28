// Graphviz DOT export: serialises a CitationGraph to a DOT language string.

import type { CitationGraph, GraphNode, GraphEdge, EdgeKind } from "./types.js";

const EDGE_COLORS: Record<EdgeKind, string> = {
  cites: "#888888",
  supports: "#2ecc71",
  refutes: "#e74c3c",
  neutral: "#95a5a6",
};

const NODE_COLORS: Record<GraphNode["kind"], string> = {
  claim: "#3498db",
  source: "#f39c12",
  evidence: "#9b59b6",
};

function escapeLabel(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function nodeAttrs(node: GraphNode): string {
  const color = NODE_COLORS[node.kind];
  const label = escapeLabel(node.label);
  const shape = node.kind === "claim" ? "box" : node.kind === "source" ? "ellipse" : "diamond";
  return `[label="${label}" shape=${shape} style=filled fillcolor="${color}" fontcolor=white]`;
}

function edgeAttrs(edge: GraphEdge): string {
  const color = EDGE_COLORS[edge.kind];
  const label = edge.kind;
  return `[label="${label}" color="${color}" penwidth=${Math.max(1, edge.weight * 3).toFixed(1)}]`;
}

export interface DotExportOptions {
  readonly graphName?: string;
  readonly directed?: boolean;
  readonly rankdir?: "TB" | "LR" | "BT" | "RL";
}

/**
 * Export a CitationGraph to a Graphviz DOT string.
 * Supports directed (default) and undirected modes.
 */
export function exportDot(graph: CitationGraph, options: DotExportOptions = {}): string {
  const name = options.graphName ?? "CitationGraph";
  const directed = options.directed !== false;
  const rankdir = options.rankdir ?? "LR";
  const graphType = directed ? "digraph" : "graph";
  const arrowOp = directed ? "->" : "--";

  const lines: string[] = [];
  lines.push(`${graphType} "${escapeLabel(name)}" {`);
  lines.push(`  rankdir=${rankdir};`);
  lines.push(`  node [fontname="Helvetica" fontsize=11];`);
  lines.push(`  edge [fontname="Helvetica" fontsize=9];`);
  lines.push("");

  for (const node of graph.nodes.values()) {
    const attrs = nodeAttrs(node);
    lines.push(`  "${node.id}" ${attrs};`);
  }

  lines.push("");

  for (const edge of graph.edges.values()) {
    const attrs = edgeAttrs(edge);
    lines.push(`  "${edge.from}" ${arrowOp} "${edge.to}" ${attrs};`);
  }

  lines.push("}");
  return lines.join("\n");
}
