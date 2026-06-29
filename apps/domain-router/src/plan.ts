// Builds a VerificationPlan: the ordered list of specialized verifiers for a given claim.
import { z } from "zod";
import { ok, err, type Result } from "@veritas/core";
import { Domain, ClaimType } from "@veritas/taxonomy";
import type { SpecializedVerifier, SpecializedVerifiableClaim } from "@veritas/verifier-kit";
import { VerifierRegistry, selectVerifiers } from "./registry.js";
import { PlanBuildError } from "./errors.js";
import type { DomainRouterConfig } from "./config.js";

/** An ordered execution plan pairing claim context with selected verifiers. */
export interface VerificationPlan {
  readonly claimId: string;
  readonly claimText: string;
  readonly domain: string;
  readonly claimType: string;
  readonly classificationConfidence: number;
  readonly verifiers: ReadonlyArray<SpecializedVerifier>;
  readonly createdAt: string;
}

export const VerificationPlanSchema = z.object({
  claimId: z.string().min(1),
  claimText: z.string().min(1),
  domain: z.string(),
  claimType: z.string(),
  classificationConfidence: z.number().min(0).max(1),
  verifierIds: z.array(z.string()),
  createdAt: z.string(),
});

/** Lightweight synchronous heuristic classification using taxonomy enums. */
function classifyHeuristic(text: string): { domain: Domain; type: ClaimType; score: number } {
  const lower = text.toLowerCase();
  if (/\b(stock|revenue|profit|eps|earnings|sec|edgar|share|dividend)\b/.test(lower)) {
    return { domain: Domain.Financial, type: ClaimType.Statistical, score: 0.75 };
  }
  if (/\b(study|research|trial|hypothesis|peer.review|journal|pubmed)\b/.test(lower)) {
    return { domain: Domain.Scientific, type: ClaimType.Causal, score: 0.75 };
  }
  if (/\b(patient|drug|dose|clinical|fda|treatment|disease|diagnosis)\b/.test(lower)) {
    return { domain: Domain.Medical, type: ClaimType.Causal, score: 0.75 };
  }
  if (/\b(bitcoin|ethereum|blockchain|token|crypto|wallet|defi|nft)\b/.test(lower)) {
    return { domain: Domain.Crypto, type: ClaimType.Statistical, score: 0.75 };
  }
  if (/\b(law|court|statute|regulation|legal|plaintiff|defendant|ruling)\b/.test(lower)) {
    return { domain: Domain.Legal, type: ClaimType.Definitional, score: 0.7 };
  }
  if (/\b(report|journalist|news|article|headline|media|press)\b/.test(lower)) {
    return { domain: Domain.News, type: ClaimType.Event, score: 0.65 };
  }
  return { domain: Domain.General, type: ClaimType.Definitional, score: 0.5 };
}

/** Build a VerificationPlan for a claim by classifying it and selecting verifiers. */
export function buildPlan(
  claim: SpecializedVerifiableClaim,
  registry: VerifierRegistry,
  config: DomainRouterConfig,
): Result<VerificationPlan> {
  try {
    const classification = classifyHeuristic(claim.text);
    const domain = claim.domain ?? classification.domain;

    const selected = selectVerifiers(claim, registry, {
      maxVerifiers: config.maxVerifiersPerClaim,
      restrictToDomains: [domain],
    });

    const verifiers: ReadonlyArray<SpecializedVerifier> =
      selected.length > 0
        ? selected
        : selectVerifiers(claim, registry, { maxVerifiers: config.maxVerifiersPerClaim });

    return ok({
      claimId: claim.id,
      claimText: claim.text,
      domain: String(domain),
      claimType: String(classification.type),
      classificationConfidence: classification.score,
      verifiers,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    return err(new PlanBuildError(claim.id, e instanceof Error ? e.message : String(e)));
  }
}
