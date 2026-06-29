// Build a CitationGraph from a verification report with claims, citations, and evidence.

import { isOk, ok, err, AppError, type Result } from "@veritas/core";
import type { Report, Citation, Source, Evidence } from "@veritas/contracts";
import { emptyGraph, addNode, addEdge } from "./graph.js";
import { makeClaimNode, makeSourceNode, makeEvidenceNode } from "./node.js";
import { makeCitesEdge, makeEdge, edgeKindFromStance } from "./edge.js";
import type { CitationGraph, GraphNode, GraphEdge } from "./types.js";

export interface BuildInput {
  readonly report: Report;
  readonly citations: readonly Citation[];
  readonly sources: readonly Source[];
  readonly evidence: readonly Evidence[];
}

export class GraphBuildError extends AppError {
  constructor(message: string) {
    super("INTERNAL", 500, `GraphBuildError: ${message}`, {});
  }
}

function safeAddNode(graph: CitationGraph, node: GraphNode): CitationGraph {
  if (graph.nodes.has(node.id)) return graph;
  const result = addNode(graph, node);
  return isOk(result) ? result.value : graph;
}

function safeAddEdge(graph: CitationGraph, edge: GraphEdge): CitationGraph {
  if (graph.edges.has(edge.id)) return graph;
  const result = addEdge(graph, edge);
  return isOk(result) ? result.value : graph;
}

function claimNodeId(claimText: string): string {
  return `claim-${claimText.slice(0, 48).replace(/\s+/g, "-").toLowerCase()}`;
}

export function buildGraphFromReport(
  input: BuildInput,
): Result<CitationGraph, GraphBuildError> {
  const { report, citations, sources, evidence } = input;

  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const citationById = new Map(citations.map((c) => [c.id, c]));

  let graph: CitationGraph = emptyGraph();

  for (const reportClaim of report.claims) {
    const nodeId = claimNodeId(reportClaim.claim);
    const claimNode = makeClaimNode({
      id: nodeId,
      text: reportClaim.claim,
      normalized: null,
      verdict: reportClaim.verdict,
      confidence: reportClaim.confidence,
      reasoning: reportClaim.reasoning,
      citationIds: reportClaim.citationIds,
      order: 0,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    });
    graph = safeAddNode(graph, claimNode);

    for (const citeId of reportClaim.citationIds) {
      const citation = citationById.get(citeId);
      if (!citation) continue;
      const source = sourceById.get(citation.sourceId);
      if (!source) continue;
      graph = safeAddNode(graph, makeSourceNode(source));
      const citesEdge = makeCitesEdge(nodeId, source.id, citation.relevance);
      graph = safeAddEdge(graph, citesEdge);
    }
  }

  for (const evd of evidence) {
    const evdNode = makeEvidenceNode(evd);
    graph = safeAddNode(graph, evdNode);

    const targetClaimId = claimNodeId(evd.claimId);
    if (graph.nodes.has(targetClaimId)) {
      const kind = edgeKindFromStance(evd.stance);
      const towardClaim = makeEdge(evdNode.id, targetClaimId, kind, evd.weight);
      graph = safeAddEdge(graph, towardClaim);
    }

    if (evd.sourceId) {
      const source = sourceById.get(evd.sourceId);
      if (source) {
        graph = safeAddNode(graph, makeSourceNode(source));
        const linkEdge = makeEdge(evdNode.id, source.id, "cites", 1.0);
        graph = safeAddEdge(graph, linkEdge);
      }
    }
  }

  return ok(graph);
}
