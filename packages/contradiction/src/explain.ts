// Explain contradictions in human-readable form using LLM or template fallback.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { ClaimPair } from "./pair.js";
import type { ContradictionCluster } from "./cluster.js";

export interface ContradictionExplanation {
  readonly pairId?: string;
  readonly clusterId?: string;
  readonly summary: string;
  readonly details: string;
  readonly suggestedResolution?: string;
}

export interface ExplainerPort {
  explainPair(pair: ClaimPair): Promise<Result<ContradictionExplanation>>;
  explainCluster(
    cluster: ContradictionCluster,
  ): Promise<Result<ContradictionExplanation>>;
}

/** Template-based explanation for a claim pair (no LLM required) */
export function templateExplainPair(
  pair: ClaimPair,
): ContradictionExplanation {
  const confidence = pair.nliScore?.confidence ?? 0;
  const pct = Math.round(confidence * 100);
  return {
    pairId: pair.pairId,
    summary: `Claim "${pair.premise.text}" contradicts "${pair.hypothesis.text}"`,
    details: [
      `NLI relation: ${pair.nliScore?.relation ?? "unknown"} (${pct}% confidence).`,
      `Premise (id=${pair.premise.id}): "${pair.premise.text}"`,
      `Hypothesis (id=${pair.hypothesis.id}): "${pair.hypothesis.text}"`,
    ].join(" "),
    suggestedResolution:
      "Review both claims against primary sources and retain the one with stronger provenance.",
  };
}

/** Template-based explanation for an entire contradiction cluster */
export function templateExplainCluster(
  cluster: ContradictionCluster,
): ContradictionExplanation {
  const count = cluster.claimIds.length;
  return {
    clusterId: cluster.clusterId,
    summary: `A contradiction cluster of ${count} claim(s) was detected.`,
    details: [
      `Cluster ID: ${cluster.clusterId}.`,
      `Claim IDs involved: ${cluster.claimIds.join(", ")}.`,
      `Number of contradicting pairs: ${cluster.pairs.length}.`,
    ].join(" "),
    suggestedResolution:
      "Investigate each pair in the cluster and adjudicate using authoritative evidence.",
  };
}

/** No-op explainer backed by templates (zero external calls) */
export class TemplateExplainer implements ExplainerPort {
  async explainPair(
    pair: ClaimPair,
  ): Promise<Result<ContradictionExplanation>> {
    return ok(templateExplainPair(pair));
  }

  async explainCluster(
    cluster: ContradictionCluster,
  ): Promise<Result<ContradictionExplanation>> {
    return ok(templateExplainCluster(cluster));
  }
}
