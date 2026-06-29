// DomainRouter: top-level orchestrator that routes a claim through specialized verifiers.
import { ok, err, isOk, type Result } from "@veritas/core";
import type { SpecializedVerifiableClaim, VerifierContext } from "@veritas/verifier-kit";
import { buildPlan } from "./plan.js";
import { dispatch } from "./dispatch.js";
import { mergeOutcomes, type MergedResult } from "./merge.js";
import { runFallback } from "./fallback.js";
import type { DomainRouterConfig } from "./config.js";
import { RoutingError } from "./errors.js";
import type { VerifierRegistry } from "./registry.js";

/** Route a claim through the verifier registry and return a merged result. */
export async function routeClaim(
  claim: SpecializedVerifiableClaim,
  registry: VerifierRegistry,
  ctx: VerifierContext,
  config: DomainRouterConfig,
): Promise<Result<MergedResult>> {
  const planResult = buildPlan(claim, registry, config);
  if (!isOk(planResult)) {
    return planResult;
  }
  const plan = planResult.value;

  if (plan.verifiers.length === 0) {
    if (!config.enableFallback) {
      return err(
        new RoutingError(`No verifiers available for domain "${plan.domain}" and fallback disabled`),
      );
    }
    const fallbackResult = await runFallback(claim, ctx);
    if (!isOk(fallbackResult)) return fallbackResult;

    const outcome = {
      verifierId: "fallback-general",
      result: fallbackResult,
      durationMs: 0,
    };
    return mergeOutcomes(claim.id, plan.domain, [outcome]);
  }

  const outcomes = await dispatch(plan, ctx, config);

  const merged = mergeOutcomes(claim.id, plan.domain, outcomes);
  if (isOk(merged)) return merged;

  if (config.enableFallback) {
    const fallbackResult = await runFallback(claim, ctx);
    if (!isOk(fallbackResult)) return fallbackResult;
    const fallbackOutcome = {
      verifierId: "fallback-general",
      result: fallbackResult,
      durationMs: 0,
    };
    return mergeOutcomes(claim.id, plan.domain, [fallbackOutcome]);
  }

  return merged;
}
