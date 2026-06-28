// Maps @veritas/onboarding domain objects to HTTP response shapes.
import {
  type OnboardingFlow,
  type OnboardingStep,
  type Checklist,
  flowProgress,
  buildChecklist,
} from "@veritas/onboarding";

export interface FlowResponse {
  readonly id: string;
  readonly userId: string;
  readonly organizationId: string | null;
  readonly name: string;
  readonly description: string;
  readonly status: string;
  readonly templateId: string | null;
  readonly progress: { completed: number; total: number; percent: number };
  readonly stepCount: number;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly abandonedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StepResponse {
  readonly id: string;
  readonly flowId: string;
  readonly kind: string;
  readonly title: string;
  readonly description: string;
  readonly order: number;
  readonly required: boolean;
  readonly skippable: boolean;
  readonly status: string;
  readonly completedAt: string | null;
}

export function toFlowResponse(flow: OnboardingFlow): FlowResponse {
  return {
    id: flow.id,
    userId: flow.userId,
    organizationId: flow.organizationId,
    name: flow.name,
    description: flow.description,
    status: flow.status,
    templateId: flow.templateId,
    progress: flowProgress(flow),
    stepCount: flow.steps.length,
    startedAt: flow.startedAt,
    completedAt: flow.completedAt,
    abandonedAt: flow.abandonedAt,
    createdAt: flow.createdAt,
    updatedAt: flow.updatedAt,
  };
}

export function toStepResponse(step: OnboardingStep): StepResponse {
  return {
    id: step.id,
    flowId: step.flowId,
    kind: step.kind,
    title: step.title,
    description: step.description,
    order: step.order,
    required: step.required,
    skippable: step.skippable,
    status: step.status,
    completedAt: step.completedAt,
  };
}

export function toChecklistResponse(checklist: Checklist): Checklist {
  return checklist;
}

export function toFlowWithStepsResponse(
  flow: OnboardingFlow,
): FlowResponse & { readonly steps: StepResponse[]; readonly checklist: Checklist } {
  return {
    ...toFlowResponse(flow),
    steps: flow.steps.map(toStepResponse),
    checklist: buildChecklist(flow),
  };
}
