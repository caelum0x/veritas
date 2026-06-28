// Claim consistency graph: adjacency list keyed by claim ID with edge relation labels.
import type { ClaimText } from "./pair.js";
import type { ClaimPair } from "./pair.js";
import type { NliRelation } from "./relation.js";

export interface GraphEdge {
  readonly fromId: string;
  readonly toId: string;
  readonly relation: NliRelation;
  readonly confidence: number;
}

export interface ConsistencyGraph {
  readonly nodes: ReadonlyMap<string, ClaimText>;
  readonly edges: ReadonlyArray<GraphEdge>;
}

/** Build an immutable consistency graph from a set of scored pairs. */
export function buildConsistencyGraph(
  claims: ReadonlyArray<ClaimText>,
  scoredPairs: ReadonlyArray<ClaimPair>,
): ConsistencyGraph {
  const nodes = new Map<string, ClaimText>();
  for (const claim of claims) {
    nodes.set(claim.id, claim);
  }

  const edges: GraphEdge[] = [];
  for (const pair of scoredPairs) {
    if (!pair.nliScore) continue;
    edges.push({
      fromId: pair.premise.id,
      toId: pair.hypothesis.id,
      relation: pair.nliScore.relation,
      confidence: pair.nliScore.confidence,
    });
  }

  return { nodes, edges };
}

/** Return all edges for a given claim ID (premise or hypothesis). */
export function edgesForClaim(
  graph: ConsistencyGraph,
  claimId: string,
): ReadonlyArray<GraphEdge> {
  return graph.edges.filter(
    (e) => e.fromId === claimId || e.toId === claimId,
  );
}

/** Return edges filtered by relation type. */
export function edgesByRelation(
  graph: ConsistencyGraph,
  relation: NliRelation,
): ReadonlyArray<GraphEdge> {
  return graph.edges.filter((e) => e.relation === relation);
}

/** Return neighbour claim IDs for a given claim in the graph. */
export function neighbourIds(
  graph: ConsistencyGraph,
  claimId: string,
): ReadonlyArray<string> {
  return graph.edges
    .filter((e) => e.fromId === claimId || e.toId === claimId)
    .map((e) => (e.fromId === claimId ? e.toId : e.fromId));
}

/** Compute the ratio of contradiction edges to all edges. */
export function contradictionDensity(graph: ConsistencyGraph): number {
  if (graph.edges.length === 0) return 0;
  const contradictionCount = graph.edges.filter(
    (e) => e.relation === "contradiction",
  ).length;
  return contradictionCount / graph.edges.length;
}
