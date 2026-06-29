// Source centrality scores: in-degree, PageRank, and authority using the citation graph.

import { allNodes, allEdges, getPredecessors } from "./graph.js";
import type { CitationGraph, GraphNode } from "./types.js";

export interface CentralityScores {
  readonly inDegree: ReadonlyMap<string, number>;
  readonly pageRank: ReadonlyMap<string, number>;
  readonly authority: ReadonlyMap<string, number>;
}

export function computeInDegree(graph: CitationGraph): ReadonlyMap<string, number> {
  const scores = new Map<string, number>();
  for (const node of allNodes(graph)) {
    scores.set(node.id, 0);
  }
  for (const edge of allEdges(graph)) {
    scores.set(edge.to, (scores.get(edge.to) ?? 0) + 1);
  }
  return scores;
}

export function computePageRank(
  graph: CitationGraph,
  dampingFactor: number = 0.85,
  iterations: number = 50,
): ReadonlyMap<string, number> {
  const nodes = allNodes(graph);
  const n = nodes.length;
  if (n === 0) return new Map();

  const initial = 1.0 / n;
  let rank = new Map<string, number>(nodes.map((nd) => [nd.id, initial]));

  for (let iter = 0; iter < iterations; iter++) {
    const next = new Map<string, number>();
    for (const node of nodes) {
      const preds = getPredecessors(graph, node.id);
      let incoming = 0;
      for (const predId of preds) {
        const outEdges = allEdges(graph).filter((e) => e.from === predId);
        const predRank = rank.get(predId) ?? 0;
        if (outEdges.length > 0) {
          incoming += predRank / outEdges.length;
        }
      }
      next.set(node.id, (1 - dampingFactor) / n + dampingFactor * incoming);
    }
    rank = next;
  }

  return rank;
}

export function computeAuthority(
  graph: CitationGraph,
  iterations: number = 20,
): ReadonlyMap<string, number> {
  const nodes = allNodes(graph);
  if (nodes.length === 0) return new Map();

  let hub = new Map<string, number>(nodes.map((nd) => [nd.id, 1.0]));
  let authority = new Map<string, number>(nodes.map((nd) => [nd.id, 1.0]));
  const edges = allEdges(graph);

  for (let iter = 0; iter < iterations; iter++) {
    const nextAuth = new Map<string, number>();
    const nextHub = new Map<string, number>();

    for (const node of nodes) {
      const preds = Array.from(getPredecessors(graph, node.id));
      nextAuth.set(node.id, preds.reduce((sum, pid) => sum + (hub.get(pid) ?? 0), 0));
    }

    for (const node of nodes) {
      const succs = edges.filter((e) => e.from === node.id).map((e) => e.to);
      nextHub.set(node.id, succs.reduce((sum, sid) => sum + (nextAuth.get(sid) ?? 0), 0));
    }

    const authNorm = Math.sqrt(
      Array.from(nextAuth.values()).reduce((s, v) => s + v * v, 0),
    ) || 1;
    const hubNorm = Math.sqrt(
      Array.from(nextHub.values()).reduce((s, v) => s + v * v, 0),
    ) || 1;

    authority = new Map(Array.from(nextAuth.entries()).map(([k, v]) => [k, v / authNorm]));
    hub = new Map(Array.from(nextHub.entries()).map(([k, v]) => [k, v / hubNorm]));
  }

  return authority;
}

export function computeCentrality(graph: CitationGraph): CentralityScores {
  return {
    inDegree: computeInDegree(graph),
    pageRank: computePageRank(graph),
    authority: computeAuthority(graph),
  };
}

export function topNodesByPageRank(
  graph: CitationGraph,
  k: number = 10,
): readonly { id: string; kind: string; score: number }[] {
  const pr = computePageRank(graph);
  return Array.from(pr.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([id, score]) => ({
      id,
      kind: graph.nodes.get(id)?.kind ?? "unknown",
      score,
    }));
}
