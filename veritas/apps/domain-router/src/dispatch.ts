// Dispatch: execute specialized verifiers from a plan with concurrency control and timeout.
import { ok, err, isOk, type Result, withTimeout, pLimit } from "@veritas/core";
import type { VerifierContext, VerifierOutput, SpecializedVerifiableClaim } from "@veritas/verifier-kit";
import { VerifierTimeoutError } from "@veritas/verifier-kit";
import type { VerificationPlan } from "./plan.js";
import { DispatchError } from "./errors.js";
import type { DomainRouterConfig } from "./config.js";

/** Outcome for one verifier dispatch: either a successful output or a typed error. */
export interface DispatchOutcome {
  readonly verifierId: string;
  readonly result: Result<VerifierOutput>;
  readonly durationMs: number;
}

/** Extract a VerifiableClaim from the plan for verifier dispatch. */
function planToClaim(plan: VerificationPlan): SpecializedVerifiableClaim {
  return {
    id: plan.claimId,
    text: plan.claimText,
    domain: plan.domain,
  };
}

/** Run all verifiers in the plan concurrently and collect outcomes. */
export async function dispatch(
  plan: VerificationPlan,
  ctx: VerifierContext,
  config: DomainRouterConfig,
): Promise<ReadonlyArray<DispatchOutcome>> {
  const limit = pLimit(config.maxConcurrentVerifiers);
  const claim = planToClaim(plan);

  const tasks = plan.verifiers.map((verifier) =>
    limit(async (): Promise<DispatchOutcome> => {
      const start = Date.now();
      try {
        const raceResult = await withTimeout(
          verifier.verify(claim, ctx),
          config.verifierTimeoutMs,
        );
        const durationMs = Date.now() - start;
        if (isOk(raceResult)) {
          return { verifierId: verifier.id, result: raceResult, durationMs };
        }
        return { verifierId: verifier.id, result: raceResult, durationMs };
      } catch (e) {
        const durationMs = Date.now() - start;
        if (e instanceof Error && e.message.includes("timed out")) {
          return {
            verifierId: verifier.id,
            result: err(new VerifierTimeoutError(verifier.id, config.verifierTimeoutMs)),
            durationMs,
          };
        }
        return {
          verifierId: verifier.id,
          result: err(new DispatchError(verifier.id, e instanceof Error ? e.message : String(e))),
          durationMs,
        };
      }
    }),
  );

  return Promise.all(tasks);
}

/** Filter dispatch outcomes to only successful ones. */
export function successfulOutcomes(
  outcomes: ReadonlyArray<DispatchOutcome>,
): ReadonlyArray<DispatchOutcome & { result: ReturnType<typeof ok<VerifierOutput>> }> {
  return outcomes.filter(
    (o): o is DispatchOutcome & { result: ReturnType<typeof ok<VerifierOutput>> } => isOk(o.result),
  );
}
