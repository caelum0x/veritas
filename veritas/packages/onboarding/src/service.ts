// Onboarding service orchestrating flows, steps, templates, and completion rewards.
import { type Result, ok, err, type Clock, systemClock } from "@veritas/core";
import { type OnboardingFlow, makeFlow, startFlow, abandonFlow, addStepToFlow, replaceStep, checkFlowCompletion } from "./flow.js";
import { type OnboardingStep, makeStep, completeStep, skipStep } from "./step.js";
import { type CompletionReward, grantRewards, isFlowEligibleForRewards } from "./completion.js";
import { type FlowTemplate, templateToCreateFlow, templateStepsToCreateSteps, templateRewards, BUILT_IN_TEMPLATES } from "./template.js";
import { type OnboardingStore, createInMemoryOnboardingStore } from "./store.js";
import {
  FlowNotFoundError,
  StepNotFoundError,
  TemplateNotFoundError,
  FlowAlreadyCompletedError,
  FlowAbandonedError,
  StepNotSkippableError,
} from "./errors.js";

export interface OnboardingServiceDeps {
  store: OnboardingStore;
  clock: Clock;
  extraTemplates?: ReadonlyMap<string, FlowTemplate>;
}

export interface OnboardingService {
  startFromTemplate(templateId: string, userId: string, organizationId?: string | null): Result<OnboardingFlow>;
  startBlankFlow(userId: string, name: string, organizationId?: string | null): Result<OnboardingFlow>;
  getFlow(flowId: string): Result<OnboardingFlow>;
  getUserFlows(userId: string): ReadonlyArray<OnboardingFlow>;
  activateFlow(flowId: string): Result<OnboardingFlow>;
  abandonUserFlow(flowId: string): Result<OnboardingFlow>;
  completeStep(flowId: string, stepId: string): Result<{ flow: OnboardingFlow; rewards: ReadonlyArray<CompletionReward> }>;
  skipStep(flowId: string, stepId: string): Result<OnboardingFlow>;
  getRewards(flowId: string): ReadonlyArray<CompletionReward>;
}

export function createOnboardingService(deps?: Partial<OnboardingServiceDeps>): OnboardingService {
  const store = deps?.store ?? createInMemoryOnboardingStore();
  const clock = deps?.clock ?? systemClock;
  const allTemplates: ReadonlyMap<string, FlowTemplate> = deps?.extraTemplates
    ? new Map([...BUILT_IN_TEMPLATES, ...deps.extraTemplates])
    : BUILT_IN_TEMPLATES;

  function now(): string {
    return clock.nowIso();
  }

  function resolveTemplate(templateId: string): Result<FlowTemplate> {
    const template = allTemplates.get(templateId);
    if (!template) return err(new TemplateNotFoundError(templateId));
    return ok(template);
  }

  function resolveFlow(flowId: string): Result<OnboardingFlow> {
    const flow = store.getFlow(flowId);
    if (!flow) return err(new FlowNotFoundError(flowId));
    return ok(flow);
  }

  function resolveStep(flow: OnboardingFlow, stepId: string): Result<OnboardingStep> {
    const step = flow.steps.find((s) => s.id === stepId);
    if (!step) return err(new StepNotFoundError(stepId));
    return ok(step);
  }

  function guardActive(flow: OnboardingFlow): Result<void> {
    if (flow.status === "completed") return err(new FlowAlreadyCompletedError(flow.id));
    if (flow.status === "abandoned") return err(new FlowAbandonedError(flow.id));
    return ok(undefined);
  }

  function startFromTemplate(
    templateId: string,
    userId: string,
    organizationId: string | null = null,
  ): Result<OnboardingFlow> {
    const templateResult = resolveTemplate(templateId);
    if (!templateResult.ok) return templateResult;
    const template = templateResult.value;

    const ts = now();
    const createFlowInput = templateToCreateFlow(template, userId, organizationId);
    let flow = makeFlow(createFlowInput, ts);
    flow = startFlow(flow, ts);

    const stepDefs = templateStepsToCreateSteps(template, flow.id);
    for (const def of stepDefs) {
      const step = makeStep(def);
      flow = addStepToFlow(flow, step, ts);
    }

    store.saveFlow(flow);
    return ok(flow);
  }

  function startBlankFlow(
    userId: string,
    name: string,
    organizationId: string | null = null,
  ): Result<OnboardingFlow> {
    const ts = now();
    let flow = makeFlow({ templateId: null, userId, organizationId, name, description: "", metadata: {} }, ts);
    flow = startFlow(flow, ts);
    store.saveFlow(flow);
    return ok(flow);
  }

  function getFlow(flowId: string): Result<OnboardingFlow> {
    return resolveFlow(flowId);
  }

  function getUserFlows(userId: string): ReadonlyArray<OnboardingFlow> {
    return store.getFlowsByUser(userId);
  }

  function activateFlow(flowId: string): Result<OnboardingFlow> {
    const flowResult = resolveFlow(flowId);
    if (!flowResult.ok) return flowResult;
    const activated = startFlow(flowResult.value, now());
    store.saveFlow(activated);
    return ok(activated);
  }

  function abandonUserFlow(flowId: string): Result<OnboardingFlow> {
    const flowResult = resolveFlow(flowId);
    if (!flowResult.ok) return flowResult;
    const abandoned = abandonFlow(flowResult.value, now());
    store.saveFlow(abandoned);
    return ok(abandoned);
  }

  function completeStepFn(
    flowId: string,
    stepId: string,
  ): Result<{ flow: OnboardingFlow; rewards: ReadonlyArray<CompletionReward> }> {
    const flowResult = resolveFlow(flowId);
    if (!flowResult.ok) return flowResult;

    const guardResult = guardActive(flowResult.value);
    if (!guardResult.ok) return guardResult;

    const stepResult = resolveStep(flowResult.value, stepId);
    if (!stepResult.ok) return stepResult;

    const ts = now();
    const updatedStep = completeStep(stepResult.value, ts);
    let flow = replaceStep(flowResult.value, updatedStep, ts);
    flow = checkFlowCompletion(flow, ts);

    let rewards: ReadonlyArray<CompletionReward> = [];
    if (isFlowEligibleForRewards(flow)) {
      const templateId = flow.templateId;
      const defs = templateId
        ? (() => {
            const t = allTemplates.get(templateId);
            return t ? templateRewards(t) : [];
          })()
        : [];
      if (defs.length > 0) {
        rewards = grantRewards(flow, defs, ts);
        store.saveRewards(rewards);
      }
    }

    store.saveFlow(flow);
    return ok({ flow, rewards });
  }

  function skipStepFn(flowId: string, stepId: string): Result<OnboardingFlow> {
    const flowResult = resolveFlow(flowId);
    if (!flowResult.ok) return flowResult;

    const guardResult = guardActive(flowResult.value);
    if (!guardResult.ok) return guardResult;

    const stepResult = resolveStep(flowResult.value, stepId);
    if (!stepResult.ok) return stepResult;

    if (!stepResult.value.skippable) {
      return err(new StepNotSkippableError(stepId));
    }

    const ts = now();
    const skipped = skipStep(stepResult.value);
    let flow = replaceStep(flowResult.value, skipped, ts);
    flow = checkFlowCompletion(flow, ts);
    store.saveFlow(flow);
    return ok(flow);
  }

  function getRewards(flowId: string): ReadonlyArray<CompletionReward> {
    return store.getRewardsByFlow(flowId);
  }

  return {
    startFromTemplate,
    startBlankFlow,
    getFlow,
    getUserFlows,
    activateFlow,
    abandonUserFlow,
    completeStep: completeStepFn,
    skipStep: skipStepFn,
    getRewards,
  };
}
