// Shared types for citation-graph: node kinds, edge kinds, and graph shape.

export type NodeKind = "claim" | "source" | "evidence";
export type EdgeKind = "cites" | "supports" | "refutes" | "neutral";

export interface GraphNodeBase {
  readonly id: string;
  readonly kind: NodeKind;
  readonly label: string;
}

export interface ClaimNode extends GraphNodeBase {
  readonly kind: "claim";
  readonly verdict: string | null;
  readonly confidence: number | null;
}

export interface SourceNode extends GraphNodeBase {
  readonly kind: "source";
  readonly url: string;
  readonly domain: string;
  readonly tier: string;
}

export interface EvidenceNode extends GraphNodeBase {
  readonly kind: "evidence";
  readonly stance: "supports" | "refutes" | "neutral";
  readonly weight: number;
}

export type GraphNode = ClaimNode | SourceNode | EvidenceNode;

export interface GraphEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly kind: EdgeKind;
  readonly weight: number;
}

export interface CitationGraph {
  readonly nodes: ReadonlyMap<string, GraphNode>;
  readonly edges: ReadonlyMap<string, GraphEdge>;
  readonly adjacency: ReadonlyMap<string, ReadonlySet<string>>;
  readonly reverseAdjacency: ReadonlyMap<string, ReadonlySet<string>>;
}
