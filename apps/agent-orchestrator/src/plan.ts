// ExecutionPlanBuilder: constructs an immutable ExecutionPlan from claim context and strategy.

import { newId, epochToIso } from "@veritas/core";
import type { Logger } from "@veritas/core";
import type { EffortLevel, StrategyKind, ExecutionPlan, PipelineStep } from "./types.js";
import { makeStep } from "./step.js";

/** Options for building an execution plan. */
export interface PlanOptions {
  readonly claimId: string;
  readonly strategy: StrategyKind;
  readonly effortLevel: EffortLevel;
  /** Named logical steps; each will be dispatched to a routed agent. */
  readonly stepNames: readonly string[];
  /** Whether each step is required for pipeline success (default: all required). */
  readonly requiredMask?: readonly boolean[];
}

/** Build an immutable ExecutionPlan from the supplied options. */
export function buildPlan(options: PlanOptions, logger: Logger): ExecutionPlan {
  const planId = newId("plan");
  const { claimId, effortLevel, stepNames, requiredMask } = options;
  const createdAt = epochToIso(Date.now());

  const steps: readonly PipelineStep[] = stepNames.map((name, i) =>
    makeStep(name, effortLevel, requiredMask?.[i] ?? true),
  );

  logger.info("plan: built", {
    planId,
    claimId,
    strategy: options.strategy,
    effortLevel,
    stepCount: steps.length,
  });

  return { planId, claimId, steps, createdAt, effortLevel };
}

/** Return a new plan with extra steps appended (immutable). */
export function appendSteps(
  plan: ExecutionPlan,
  extraStepNames: readonly string[],
  required = true,
): ExecutionPlan {
  const extra: PipelineStep[] = extraStepNames.map((name) =>
    makeStep(name, plan.effortLevel, required),
  );
  return { ...plan, steps: [...plan.steps, ...extra] };
}

/** Return a new plan with only required steps retained. */
export function filterRequiredSteps(plan: ExecutionPlan): ExecutionPlan {
  return { ...plan, steps: plan.steps.filter((s) => s.required) };
}
