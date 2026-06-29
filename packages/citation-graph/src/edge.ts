// Factory functions for creating typed directed edges between graph nodes.

import { newId } from "@veritas/core";
import type { EdgeKind, GraphEdge } from "./types.js";

export function makeEdge(
  from: string,
  to: string,
  kind: EdgeKind,
  weight: number = 1.0,
): GraphEdge {
  return {
    id: newId("edge"),
    from,
    to,
    kind,
    weight: Math.max(0, Math.min(1, weight)),
  };
}

export function makeCitesEdge(claimId: string, sourceId: string, relevance: number): GraphEdge {
  return makeEdge(claimId, sourceId, "cites", relevance);
}

export function makeSupportsEdge(evidenceId: string, claimId: string, weight: number): GraphEdge {
  return makeEdge(evidenceId, claimId, "supports", weight);
}

export function makeRefutesEdge(evidenceId: string, claimId: string, weight: number): GraphEdge {
  return makeEdge(evidenceId, claimId, "refutes", weight);
}

export function makeNeutralEdge(evidenceId: string, claimId: string, weight: number): GraphEdge {
  return makeEdge(evidenceId, claimId, "neutral", weight);
}

export function edgeKindFromStance(stance: "supports" | "refutes" | "neutral"): EdgeKind {
  return stance;
}
