// RoutingService: routes claims through the verifier registry and returns merged verdicts.
import { isOk, type Result } from "@veritas/core";
import { buildPlan } from "../../plan.js";
import { routeClaim } from "../../router.js";
import type { MergedResult } from "../../merge.js";
import type { VerificationPlan } from "../../plan.js";
import type { VerifierRegistry } from "../../registry.js";
import type { DomainRouterConfig } from "../../config.js";
import type { VerifierContext, SpecializedVerifiableClaim } from "@veritas/verifier-kit";
import type { Logger } from "@veritas/observability";

export interface RoutingDeps {
  readonly registry: VerifierRegistry;
  readonly ctx: VerifierContext;
  readonly config: DomainRouterConfig;
  readonly logger: Logger;
}

export class RoutingService {
  readonly #registry: VerifierRegistry;
  readonly #ctx: VerifierContext;
  readonly #config: DomainRouterConfig;
  readonly #logger: Logger;

  constructor(deps: RoutingDeps) {
    this.#registry = deps.registry;
    this.#ctx = deps.ctx;
    this.#config = deps.config;
    this.#logger = deps.logger;
  }

  async routeClaim(claim: SpecializedVerifiableClaim): Promise<Result<MergedResult>> {
    this.#logger.info("routing claim", { claimId: claim.id, domain: claim.domain });
    const result = await routeClaim(claim, this.#registry, this.#ctx, this.#config);
    if (isOk(result)) {
      this.#logger.info("claim routed successfully", {
        claimId: claim.id,
        verdict: String(result.value.aggregated.verdict),
        verifierCount: result.value.verifierIds.length,
      });
    } else {
      this.#logger.error("claim routing failed", { claimId: claim.id, error: result.error instanceof Error ? result.error.message : String(result.error) });
    }
    return result;
  }

  previewPlan(claim: SpecializedVerifiableClaim): Result<VerificationPlan> {
    this.#logger.info("previewing verification plan", { claimId: claim.id });
    return buildPlan(claim, this.#registry, this.#config);
  }
}
