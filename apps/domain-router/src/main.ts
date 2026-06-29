// Domain-router entrypoint: expose routeClaim as the primary callable API.
import type { Result } from "@veritas/core";
import type { SpecializedVerifiableClaim, VerifierContext } from "@veritas/verifier-kit";
import { routeClaim } from "./router.js";
import type { MergedResult } from "./merge.js";
import type { DomainRouterConfig } from "./config.js";
import { defaultConfig } from "./config.js";
import type { VerifierRegistry } from "./registry.js";

export type { MergedResult } from "./merge.js";
export type { VerificationPlan } from "./plan.js";
export type { DispatchOutcome } from "./dispatch.js";
export { defaultConfig } from "./config.js";
export type { DomainRouterConfig } from "./config.js";
export { bootstrap } from "./bootstrap.js";
export type { DomainRouterDeps, DomainRouterWiring } from "./bootstrap.js";
export { VerifierRegistry } from "./registry.js";

/**
 * Route a claim through all applicable specialized verifiers and return a merged result.
 * This is the primary entry-point for the domain-router module.
 */
export async function run(
  claim: SpecializedVerifiableClaim,
  registry: VerifierRegistry,
  ctx: VerifierContext,
  config: DomainRouterConfig = defaultConfig,
): Promise<Result<MergedResult>> {
  return routeClaim(claim, registry, ctx, config);
}
