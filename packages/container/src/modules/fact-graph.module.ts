// Fact-graph module: registers an EvidenceGraphService that projects a completed
// VerificationReport into a fact graph (claims ↔ cited sources) via @veritas/fact-graph.

import { buildEvidenceGraph } from "@veritas/fact-graph";
import type { EvidenceGraph, EvidenceClaim } from "@veritas/fact-graph";
import type { VerificationReport } from "@veritas/contracts";
import type { Container } from "../container.js";
import { EVIDENCE_GRAPH_SVC } from "../tokens.js";

/** Service that builds evidence graphs from verification output. */
export interface EvidenceGraphService {
  /** Build an evidence graph directly from a completed verification report. */
  fromReport(report: VerificationReport): EvidenceGraph;
  /** Build an evidence graph from a list of evidence claims. */
  fromClaims(claims: ReadonlyArray<EvidenceClaim>): EvidenceGraph;
}

/** Project a report's claims onto the fact-graph input shape. */
function reportToClaims(report: VerificationReport): EvidenceClaim[] {
  return report.claims.map((c) => ({
    claim: c.claim,
    verdict: c.verdict,
    confidence: c.confidence,
    citations: c.citations.map((cite) => ({
      url: cite.url,
      title: cite.title,
      supports: cite.supports,
    })),
  }));
}

/** Register the EvidenceGraphService singleton. */
export function registerFactGraphModule(container: Container): void {
  container.singleton(EVIDENCE_GRAPH_SVC, (): EvidenceGraphService => ({
    fromReport(report: VerificationReport): EvidenceGraph {
      return buildEvidenceGraph(reportToClaims(report));
    },
    fromClaims(claims: ReadonlyArray<EvidenceClaim>): EvidenceGraph {
      return buildEvidenceGraph(claims);
    },
  }));
}
