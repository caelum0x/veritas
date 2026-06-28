// Agent trust graph: directed weighted edges representing inter-agent trust relationships.

import { clampPtsScore, type PtsScore } from "./pts-score.js";

/** A directed trust edge from one agent to another with a weight in [0, 1]. */
export interface TrustEdge {
  readonly from: string;
  readonly to: string;
  readonly weight: PtsScore;
  readonly createdAt: number;
}

/** In-memory adjacency structure for the trust graph. */
export interface TrustGraph {
  /** edges indexed by `${from}→${to}` key. */
  readonly edges: ReadonlyMap<string, TrustEdge>;
}

const edgeKey = (from: string, to: string): string => `${from}→${to}`;

/** Create an empty TrustGraph. */
export function emptyTrustGraph(): TrustGraph {
  return { edges: new Map() };
}

/** Return a new graph with the edge from→to set (or replaced) at the given weight. */
export function setEdge(
  graph: TrustGraph,
  from: string,
  to: string,
  weight: number,
): TrustGraph {
  const key = edgeKey(from, to);
  const edge: TrustEdge = {
    from,
    to,
    weight: clampPtsScore(weight),
    createdAt: Date.now(),
  };
  const next = new Map(graph.edges);
  next.set(key, edge);
  return { edges: next };
}

/** Return a new graph with the edge from→to removed (no-op if absent). */
export function removeEdge(
  graph: TrustGraph,
  from: string,
  to: string,
): TrustGraph {
  const key = edgeKey(from, to);
  if (!graph.edges.has(key)) return graph;
  const next = new Map(graph.edges);
  next.delete(key);
  return { edges: next };
}

/** Retrieve the direct trust weight from one agent to another, or null. */
export function getEdgeWeight(
  graph: TrustGraph,
  from: string,
  to: string,
): PtsScore | null {
  return graph.edges.get(edgeKey(from, to))?.weight ?? null;
}

/** List all agents that directly trust the given target. */
export function trustorsOf(graph: TrustGraph, target: string): readonly string[] {
  const result: string[] = [];
  for (const edge of graph.edges.values()) {
    if (edge.to === target) result.push(edge.from);
  }
  return result;
}

/** List all agents the given source directly trusts. */
export function trusteesOf(graph: TrustGraph, source: string): readonly string[] {
  const result: string[] = [];
  for (const edge of graph.edges.values()) {
    if (edge.from === source) result.push(edge.to);
  }
  return result;
}

/**
 * Compute the weighted average trust score that all trustors assign to target.
 * Returns null when target has no incoming edges.
 */
export function aggregateTrust(
  graph: TrustGraph,
  target: string,
): PtsScore | null {
  const incoming = Array.from(graph.edges.values()).filter((e) => e.to === target);
  if (incoming.length === 0) return null;
  const sum = incoming.reduce((acc, e) => acc + e.weight, 0);
  return clampPtsScore(sum / incoming.length);
}
