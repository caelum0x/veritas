// Maps domain-router internal types to HTTP response shapes for the routing feature.
import type { MergedResult } from "../../merge.js";
import type { VerificationPlan } from "../../plan.js";
import type {
  MergedResultResponse,
  VerificationPlanResponse,
} from "./routing.schema.js";

export function mapPlanToResponse(plan: VerificationPlan): VerificationPlanResponse {
  return {
    claimId: plan.claimId,
    claimText: plan.claimText,
    domain: plan.domain,
    claimType: plan.claimType,
    classificationConfidence: plan.classificationConfidence,
    verifierIds: plan.verifiers.map((v) => v.id),
    createdAt: plan.createdAt,
  };
}

export function mapMergedResultToResponse(result: MergedResult): MergedResultResponse {
  return {
    claimId: result.claimId,
    domain: result.domain,
    aggregated: {
      verdict: String(result.aggregated.verdict),
      score: typeof result.aggregated.confidence === "number"
        ? result.aggregated.confidence
        : 0,
      confidence: String(result.aggregated.confidence),
      signalCount: result.signals.length,
      aggregatedAt: result.mergedAt,
    },
    signals: result.signals.map((s) => ({
      verifierId: s.verifierId,
      verdict: String(s.verdict),
      confidence: String(s.confidence),
      weight: s.weight,
      rationale: s.rationale,
    })),
    verifierIds: [...result.verifierIds],
    mergedAt: result.mergedAt,
  };
}
