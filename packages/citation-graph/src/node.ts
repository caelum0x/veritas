// Factory functions for creating typed graph nodes (claim, source, evidence).

import type { Claim, Source, Evidence } from "@veritas/contracts";
import type { ClaimNode, SourceNode, EvidenceNode } from "./types.js";

export function makeClaimNode(claim: Claim): ClaimNode {
  return {
    id: claim.id,
    kind: "claim",
    label: claim.text.length > 80 ? `${claim.text.slice(0, 77)}...` : claim.text,
    verdict: claim.verdict ?? null,
    confidence: claim.confidence ?? null,
  };
}

export function makeSourceNode(source: Source): SourceNode {
  return {
    id: source.id,
    kind: "source",
    label: source.title ?? source.domain,
    url: source.url,
    domain: source.domain,
    tier: source.tier,
  };
}

export function makeEvidenceNode(evidence: Evidence): EvidenceNode {
  return {
    id: evidence.id,
    kind: "evidence",
    label: evidence.snippet.length > 80 ? `${evidence.snippet.slice(0, 77)}...` : evidence.snippet,
    stance: evidence.stance,
    weight: evidence.weight,
  };
}
