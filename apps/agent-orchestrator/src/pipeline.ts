// VerificationPipeline: executes an ExecutionPlan step-by-step and produces a PipelineResult.

import { ok, err, mapWithConcurrency, epochToIso, noopLogger } from "@veritas/core";
import type { Result, AppError, Logger } from "@veritas/core";
import type { VerificationReport } from "@veritas/contracts";
import { CAPAgentClient } from "./cap-agent-client.js";
import type { RegistryEntry } from "./registry.js";
import type { ExecutionPlan, PipelineResult, StepState } from "./types.js";
import { runStepAgainstAgent } from "./step.js";
import { aggregateVerdicts } from "./aggregate-verdicts.js";

/** Options that control how the pipeline runs. */
export interface PipelineRunOptions {
  /** Maximum concurrent step executions (default 3). */
  readonly concurrency?: number;
  /** Stop immediately on the first required-step failure (default false). */
  readonly failFast?: boolean;
  /** Per-step agent call timeout in milliseconds (default 30_000). */
  readonly stepTimeoutMs?: number;
}

/**
 * Agent resolver: maps a step name to the agent(s) that should handle it.
 * Callers inject this so the pipeline doesn't own routing logic.
 */
export type AgentResolver = (stepName: string) => readonly RegistryEntry[];

/** Run every step in the plan, resolve agents, collect reports, then aggregate. */
export async function runPipeline(
  plan: ExecutionPlan,
  resolveAgents: AgentResolver,
  client: CAPAgentClient,
  claimText: string,
  options: PipelineRunOptions = {},
  logger: Logger = noopLogger,
): Promise<Result<PipelineResult, AppError>> {
  const concurrency = options.concurrency ?? 3;
  const failFast = options.failFast ?? false;
  const stepTimeoutMs = options.stepTimeoutMs ?? 30_000;
  const startMs = Date.now();

  logger.info("pipeline: starting", {
    planId: plan.planId,
    claimId: plan.claimId,
    stepCount: plan.steps.length,
  });

  const stepStates: StepState[] = [];
  const successReports: VerificationReport[] = [];
  let firstRequiredError: AppError | undefined;

  const stepList = [...plan.steps];

  const results = await mapWithConcurrency(
    stepList,
    concurrency,
    async (step) => {
      const agents = resolveAgents(step.name);
      if (agents.length === 0) {
        return { step, skipped: true } as const;
      }
      // Use first resolved agent; fan-out strategy handles multi-agent dispatch elsewhere.
      const firstAgent = agents[0];
      if (firstAgent === undefined) {
        return { step, skipped: true } as const;
      }
      return runStepAgainstAgent(step, firstAgent, claimText, client, logger, stepTimeoutMs);
    },
  );

  for (let i = 0; i < results.length; i++) {
    const res = results[i] as typeof results[0] | undefined;
    const step = stepList[i] as (typeof stepList)[0] | undefined;

    if (step === undefined || res === undefined) continue;

    if (typeof res === "object" && res !== null && "skipped" in res && (res as { skipped: boolean }).skipped) {
      stepStates.push({ step, status: "skipped" });
      continue;
    }

    const stepRes = res as Result<{ state: StepState; report: VerificationReport }, AppError>;

    if (stepRes.ok) {
      stepStates.push(stepRes.value.state);
      successReports.push(stepRes.value.report);
    } else {
      const failedState: StepState = {
        step,
        status: "failed",
        errorMessage: String(stepRes.error),
      };
      stepStates.push(failedState);

      if (step.required) {
        firstRequiredError = stepRes.error;
        if (failFast) {
          logger.warn("pipeline: fail-fast on required step", { stepName: step.name });
          break;
        }
      }
    }
  }

  if (firstRequiredError !== undefined && successReports.length === 0) {
    logger.error("pipeline: no successful reports", { planId: plan.planId });
    return err(firstRequiredError);
  }

  const reportsToMerge = successReports.length > 0 ? successReports : [];
  if (reportsToMerge.length === 0) {
    return err({
      code: "INTERNAL_ERROR",
      message: "Pipeline produced no reports",
    } as unknown as AppError);
  }

  const weighted = reportsToMerge.map((report) => ({ report, weight: 1 }));
  const aggResult = aggregateVerdicts(weighted);

  if (!aggResult.ok) {
    logger.error("pipeline: aggregation failed", { planId: plan.planId });
    return err(aggResult.error);
  }

  const durationMs = Date.now() - startMs;

  logger.info("pipeline: completed", {
    planId: plan.planId,
    durationMs,
    agreementRate: aggResult.value.agreementRate,
  });

  return ok({
    planId: plan.planId,
    claimId: plan.claimId,
    finalReport: aggResult.value.report,
    steps: stepStates,
    durationMs,
  } satisfies PipelineResult);
}
