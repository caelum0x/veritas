// Defines the onboarding flow aggregate that groups ordered steps.
import { z } from "zod";
import { newId } from "@veritas/core";
import { OnboardingStepSchema, type OnboardingStep, isStepDone } from "./step.js";

export const FlowStatus = z.enum(["not_started", "in_progress", "completed", "abandoned"]);
export type FlowStatus = z.infer<typeof FlowStatus>;

export const OnboardingFlowSchema = z.object({
  id: z.string(),
  templateId: z.string().nullable().default(null),
  userId: z.string(),
  organizationId: z.string().nullable().default(null),
  name: z.string().min(1),
  description: z.string().default(""),
  status: FlowStatus.default("not_started"),
  steps: z.array(OnboardingStepSchema).default([]),
  startedAt: z.string().datetime().nullable().default(null),
  completedAt: z.string().datetime().nullable().default(null),
  abandonedAt: z.string().datetime().nullable().default(null),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type OnboardingFlow = z.infer<typeof OnboardingFlowSchema>;

export const CreateFlowSchema = OnboardingFlowSchema.omit({
  id: true,
  status: true,
  steps: true,
  startedAt: true,
  completedAt: true,
  abandonedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateFlow = z.infer<typeof CreateFlowSchema>;

export function makeFlow(input: CreateFlow, now: string): OnboardingFlow {
  return OnboardingFlowSchema.parse({
    ...input,
    id: newId("flow"),
    status: "not_started",
    steps: [],
    startedAt: null,
    completedAt: null,
    abandonedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

export function startFlow(flow: OnboardingFlow, now: string): OnboardingFlow {
  if (flow.status !== "not_started") return flow;
  return { ...flow, status: "in_progress", startedAt: now, updatedAt: now };
}

export function abandonFlow(flow: OnboardingFlow, now: string): OnboardingFlow {
  return { ...flow, status: "abandoned", abandonedAt: now, updatedAt: now };
}

export function addStepToFlow(flow: OnboardingFlow, step: OnboardingStep, now: string): OnboardingFlow {
  const steps = [...flow.steps, step].sort((a, b) => a.order - b.order);
  return { ...flow, steps, updatedAt: now };
}

export function replaceStep(flow: OnboardingFlow, updated: OnboardingStep, now: string): OnboardingFlow {
  const steps = flow.steps.map((s) => (s.id === updated.id ? updated : s));
  return { ...flow, steps, updatedAt: now };
}

export function flowProgress(flow: OnboardingFlow): { completed: number; total: number; percent: number } {
  const total = flow.steps.length;
  const completed = flow.steps.filter(isStepDone).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}

export function checkFlowCompletion(flow: OnboardingFlow, now: string): OnboardingFlow {
  const requiredDone = flow.steps.filter((s) => s.required).every(isStepDone);
  if (requiredDone && flow.status === "in_progress") {
    return { ...flow, status: "completed", completedAt: now, updatedAt: now };
  }
  return flow;
}
