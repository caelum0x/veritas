// Build a ReportProvenance attestation block from a verification run context.

import type { ReportProvenance } from "@veritas/contracts";
import type { VerificationContext } from "../pipeline/context.js";
import type { ScoredContext } from "../stages/score.js";
import { hashProvenance } from "./hash.js";

/** Input needed to build the provenance attestation (context after scoring stage). */
export type AttestationInput = VerificationContext & Partial<ScoredContext>;

/**
 * Derive the model identifier from the LLM provider attached to the context.
 * Falls back to "unknown" when the provider does not expose a model name.
 */
function resolveModel(ctx: AttestationInput): string {
  const llm = ctx.llm as unknown;
  if (
    typeof llm === "object" &&
    llm !== null &&
    "modelId" in llm &&
    typeof (llm as Record<string, unknown>)["modelId"] === "string"
  ) {
    return (llm as Record<string, unknown>)["modelId"] as string;
  }
  return "unknown";
}

/**
 * Count unique source domains cited across all adjudicated claims.
 */
function countSources(ctx: AttestationInput): number {
  const seen = new Set<string>();
  for (const ac of ctx.adjudicatedClaims) {
    for (const citation of ac.citations) {
      seen.add(citation.url);
    }
  }
  return seen.size;
}

/**
 * Assemble the provenance attestation block embedded in the final report.
 *
 * The contentHash covers the claims and verdict counts so any downstream
 * consumer can independently verify the report has not been tampered with.
 */
export function buildAttestation(ctx: AttestationInput): ReportProvenance {
  const claimCount = ctx.adjudicatedClaims.length;
  const sourceCount = countSources(ctx);
  const model = resolveModel(ctx);
  const effort = ctx.options.effort ?? "standard";
  const verifier = ctx.options.verifier ?? "veritas";
  const verifierVersion = ctx.options.verifierVersion ?? "1.0.0";
  const createdAt = new Date().toISOString();

  // Hash the stable payload: claims + metadata (excludes the hash field itself).
  const hashPayload = {
    verifier,
    verifierVersion,
    model,
    effort,
    createdAt,
    claimCount,
    sourceCount,
    claims: ctx.adjudicatedClaims.map((ac) => ({
      claim: ac.claim.text,
      verdict: ac.verdict,
      confidence: ac.confidence,
    })),
  };

  const hash = hashProvenance(hashPayload);

  return {
    contentHash: hash,
    verifier,
    verifierVersion,
    model,
    effort,
    createdAt,
    claimCount,
    sourceCount,
  };
}
