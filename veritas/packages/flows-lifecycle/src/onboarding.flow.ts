// Flow: drive the onboarding checklist — advance steps, compute progress, mark flow complete.
import { ok, err, type Result, type Clock } from "@veritas/core";
import {
  type OnboardingFlow,
  type OnboardingStep,
  type Checklist,
  buildChecklist,
  completeStep,
  skipStep,
  replaceStep,
  checkFlowCompletion,
  pendingRequiredItems,
  nextChecklistItem,
} from "@veritas/onboarding";
import { type Logger } from "@veritas/observability";

export interface OnboardingFlowStore {
  getFlow(flowId: string): Promise<OnboardingFlow | null>;
  saveFlow(flow: OnboardingFlow): Promise<void>;
}

export interface OnboardingFlowDeps {
  readonly store: OnboardingFlowStore;
  readonly clock: Clock;
  readonly logger: Logger;
}

export interface CompleteStepInput {
  readonly flowId: string;
  readonly stepId: string;
}

export interface SkipStepInput {
  readonly flowId: string;
  readonly stepId: string;
}

export interface GetChecklistInput {
  readonly flowId: string;
}

export type OnboardingFlowError = { readonly kind: "FlowNotFound"; readonly flowId: string }
  | { readonly kind: "StepNotFound"; readonly stepId: string }
  | { readonly kind: "StepNotSkippable"; readonly stepId: string };

function notFound(flowId: string): OnboardingFlowError {
  return { kind: "FlowNotFound", flowId };
}

function stepNotFound(stepId: string): OnboardingFlowError {
  return { kind: "StepNotFound", stepId };
}

function stepNotSkippable(stepId: string): OnboardingFlowError {
  return { kind: "StepNotSkippable", stepId };
}

export async function completeOnboardingStep(
  input: CompleteStepInput,
  deps: OnboardingFlowDeps,
): Promise<Result<OnboardingFlow, OnboardingFlowError>> {
  const { store, clock, logger } = deps;
  const now = clock.nowIso();

  const flow = await store.getFlow(input.flowId);
  if (flow === null) return err(notFound(input.flowId));

  const step = flow.steps.find((s) => s.id === input.stepId);
  if (step === undefined) return err(stepNotFound(input.stepId));

  const updatedStep = completeStep(step, now);
  const withStep = replaceStep(flow, updatedStep, now);
  const checked = checkFlowCompletion(withStep, now);
  await store.saveFlow(checked);
  logger.info("Onboarding step completed", { flowId: input.flowId, stepId: input.stepId });
  return ok(checked);
}

export async function skipOnboardingStep(
  input: SkipStepInput,
  deps: OnboardingFlowDeps,
): Promise<Result<OnboardingFlow, OnboardingFlowError>> {
  const { store, clock, logger } = deps;
  const now = clock.nowIso();

  const flow = await store.getFlow(input.flowId);
  if (flow === null) return err(notFound(input.flowId));

  const step = flow.steps.find((s) => s.id === input.stepId);
  if (step === undefined) return err(stepNotFound(input.stepId));
  if (!step.skippable) return err(stepNotSkippable(input.stepId));

  const updatedStep = skipStep(step);
  const withStep = replaceStep(flow, updatedStep, now);
  const checked = checkFlowCompletion(withStep, now);
  await store.saveFlow(checked);
  logger.info("Onboarding step skipped", { flowId: input.flowId, stepId: input.stepId });
  return ok(checked);
}

export async function getOnboardingChecklist(
  input: GetChecklistInput,
  deps: OnboardingFlowDeps,
): Promise<Result<Checklist, OnboardingFlowError>> {
  const flow = await deps.store.getFlow(input.flowId);
  if (flow === null) return err(notFound(input.flowId));
  return ok(buildChecklist(flow));
}

export async function getNextOnboardingStep(
  input: GetChecklistInput,
  deps: OnboardingFlowDeps,
): Promise<Result<ReturnType<typeof nextChecklistItem>, OnboardingFlowError>> {
  const flow = await deps.store.getFlow(input.flowId);
  if (flow === null) return err(notFound(input.flowId));
  const checklist = buildChecklist(flow);
  return ok(nextChecklistItem(checklist));
}

export async function getPendingRequiredSteps(
  input: GetChecklistInput,
  deps: OnboardingFlowDeps,
): Promise<Result<ReturnType<typeof pendingRequiredItems>, OnboardingFlowError>> {
  const flow = await deps.store.getFlow(input.flowId);
  if (flow === null) return err(notFound(input.flowId));
  const checklist = buildChecklist(flow);
  return ok(pendingRequiredItems(checklist));
}
