// Compensation runner: executes saga step compensations in reverse order on failure.
import type { Logger } from "@veritas/observability";
import type { SagaStep } from "./step.js";
import type { SagaContext } from "./context.js";
import { SagaCompensationError } from "./errors.js";

export interface CompensationResult {
  readonly compensated: readonly string[];
  readonly failed: readonly { stepName: string; error: unknown }[];
}

/**
 * Run compensations for all completed steps in reverse order.
 * Continues compensating remaining steps even if one compensation fails,
 * collecting all failures rather than aborting early.
 */
export async function runCompensation<TInput>(
  sagaId: string,
  steps: readonly SagaStep<TInput>[],
  completedStepNames: readonly string[],
  input: TInput,
  ctx: SagaContext,
  logger: Logger,
): Promise<CompensationResult> {
  const completedSet = new Set(completedStepNames);
  const toCompensate = steps
    .filter((s) => completedSet.has(s.name) && typeof s.compensate === "function")
    .slice()
    .reverse();

  const compensated: string[] = [];
  const failed: { stepName: string; error: unknown }[] = [];

  for (const step of toCompensate) {
    try {
      logger.info("running compensation", { sagaId, stepName: step.name });
      await step.compensate!(input, ctx);
      compensated.push(step.name);
      logger.info("compensation succeeded", { sagaId, stepName: step.name });
    } catch (error) {
      const wrapped = new SagaCompensationError(sagaId, step.name, error);
      failed.push({ stepName: step.name, error: wrapped });
      logger.error("compensation failed", {
        sagaId,
        stepName: step.name,
        err: wrapped,
      });
    }
  }

  return { compensated, failed };
}
