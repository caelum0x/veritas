// PipelineStepRunner: executes a single step in the verification pipeline against a chosen agent.

import { ok, err, tryAsync, epochToIso } from "@veritas/core";
import type { Result, AppError, Logger } from "@veritas/core";
import type { VerificationReport } from "@veritas/contracts";
import { CAPAgentClient } from "./cap-agent-client.js";
import type { RegistryEntry } from "./registry.js";
import type { EffortLevel, StepMeta, PipelineStep, StepState } from "./types.js";

/** Build a PipelineStep value object. */
export function makeStep(
  name: string,
  effortLevel: EffortLevel,
  required = true,
  description?: string,
): PipelineStep {
  return { name, effortLevel, required, description };
}

/** Build an initial StepState (pending) for a given step. */
export function pendingStepState(step: PipelineStep): StepState {
  return { step, status: "pending" };
}

/** Dispatch a single PipelineStep to a specific agent and return the updated StepState. */
export async function runStepAgainstAgent(
  step: PipelineStep,
  agent: RegistryEntry,
  claimText: string,
  client: CAPAgentClient,
  logger: Logger,
  timeoutMs = 30_000,
): Promise<Result<{ state: StepState; report: VerificationReport; meta: StepMeta }, AppError>> {
  const startMs = Date.now();
  const startedAt = epochToIso(startMs);

  logger.info("step: starting", { stepName: step.name, agentId: agent.agentId });

  const raceResult = await tryAsync(() =>
    Promise.race([
      client.hire(agent, {
        claimText,
        effort: step.effortLevel,
        timeoutMs,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Step "${step.name}" timed out after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ]),
  );

  const finishedMs = Date.now();
  const finishedAt = epochToIso(finishedMs);
  const durationMs = finishedMs - startMs;

  if (!raceResult.ok) {
    const meta: StepMeta = {
      startedAt,
      finishedAt,
      durationMs,
      agentId: agent.agentId,
      success: false,
      errorMessage: String(raceResult.error),
    };
    const failedState: StepState = {
      step,
      status: "failed",
      startedAt,
      completedAt: finishedAt,
      errorMessage: meta.errorMessage,
    };
    logger.error("step: race failed", { stepName: step.name, meta });
    return err(raceResult.error as AppError);
  }

  const hireResult = raceResult.value;

  if (!hireResult.ok) {
    const meta: StepMeta = {
      startedAt,
      finishedAt,
      durationMs,
      agentId: agent.agentId,
      success: false,
      errorMessage: String(hireResult.error),
    };
    const failedState: StepState = {
      step,
      status: "failed",
      startedAt,
      completedAt: finishedAt,
      errorMessage: meta.errorMessage,
    };
    logger.warn("step: agent returned error", { stepName: step.name, meta });
    return err(hireResult.error);
  }

  const meta: StepMeta = {
    startedAt,
    finishedAt,
    durationMs: hireResult.value.durationMs,
    agentId: agent.agentId,
    success: true,
  };

  const succeededState: StepState = {
    step,
    status: "succeeded",
    startedAt,
    completedAt: finishedAt,
    report: hireResult.value.report,
  };

  logger.info("step: completed", { stepName: step.name, durationMs: meta.durationMs });

  return ok({ state: succeededState, report: hireResult.value.report, meta });
}
