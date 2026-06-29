// Tracks and summarizes user onboarding progress across one or many flows.
import { z } from "zod";
import { type OnboardingFlow, flowProgress } from "./flow.js";
import { type OnboardingStep } from "./step.js";

export const StepProgressSchema = z.object({
  stepId: z.string(),
  kind: z.string(),
  status: z.string(),
  completedAt: z.string().datetime().nullable(),
});
export type StepProgress = z.infer<typeof StepProgressSchema>;

export const FlowProgressSchema = z.object({
  flowId: z.string(),
  flowName: z.string(),
  flowStatus: z.string(),
  stepsCompleted: z.number(),
  stepsTotal: z.number(),
  percentComplete: z.number(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  steps: z.array(StepProgressSchema),
});
export type FlowProgress = z.infer<typeof FlowProgressSchema>;

export const UserProgressSchema = z.object({
  userId: z.string(),
  organizationId: z.string().nullable(),
  flows: z.array(FlowProgressSchema),
  overallPercent: z.number(),
  allFlowsComplete: z.boolean(),
});
export type UserProgress = z.infer<typeof UserProgressSchema>;

function stepToStepProgress(step: OnboardingStep): StepProgress {
  return {
    stepId: step.id,
    kind: step.kind,
    status: step.status,
    completedAt: step.completedAt,
  };
}

export function computeFlowProgress(flow: OnboardingFlow): FlowProgress {
  const { completed, total, percent } = flowProgress(flow);
  return {
    flowId: flow.id,
    flowName: flow.name,
    flowStatus: flow.status,
    stepsCompleted: completed,
    stepsTotal: total,
    percentComplete: percent,
    startedAt: flow.startedAt,
    completedAt: flow.completedAt,
    steps: flow.steps.map(stepToStepProgress),
  };
}

export function computeUserProgress(
  userId: string,
  organizationId: string | null,
  flows: readonly OnboardingFlow[],
): UserProgress {
  const flowProgresses = flows.map(computeFlowProgress);
  const totalPercent =
    flowProgresses.length === 0
      ? 0
      : Math.round(
          flowProgresses.reduce((sum, fp) => sum + fp.percentComplete, 0) / flowProgresses.length,
        );
  const allFlowsComplete =
    flowProgresses.length > 0 && flowProgresses.every((fp) => fp.flowStatus === "completed");

  return {
    userId,
    organizationId,
    flows: flowProgresses,
    overallPercent: totalPercent,
    allFlowsComplete,
  };
}

export function progressDelta(before: FlowProgress, after: FlowProgress): number {
  return after.percentComplete - before.percentComplete;
}
