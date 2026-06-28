// Defines the onboarding step entity and its validation schema.
import { z } from "zod";
import { newId } from "@veritas/core";

export const StepKind = z.enum([
  "profile_setup",
  "email_verification",
  "plan_selection",
  "team_invite",
  "api_key_creation",
  "first_claim",
  "first_verification",
  "billing_setup",
  "tour_completed",
  "custom",
]);
export type StepKind = z.infer<typeof StepKind>;

export const StepStatus = z.enum(["pending", "in_progress", "completed", "skipped"]);
export type StepStatus = z.infer<typeof StepStatus>;

export const OnboardingStepSchema = z.object({
  id: z.string(),
  flowId: z.string(),
  kind: StepKind,
  title: z.string().min(1),
  description: z.string().default(""),
  order: z.number().int().nonnegative(),
  required: z.boolean().default(true),
  skippable: z.boolean().default(false),
  status: StepStatus.default("pending"),
  completedAt: z.string().datetime().nullable().default(null),
  metadata: z.record(z.unknown()).default({}),
});
export type OnboardingStep = z.infer<typeof OnboardingStepSchema>;

export const CreateStepSchema = OnboardingStepSchema.omit({ id: true, status: true, completedAt: true });
export type CreateStep = z.infer<typeof CreateStepSchema>;

export function makeStep(input: CreateStep): OnboardingStep {
  return OnboardingStepSchema.parse({
    ...input,
    id: newId("step"),
    status: "pending",
    completedAt: null,
  });
}

export function completeStep(step: OnboardingStep, now: string): OnboardingStep {
  return { ...step, status: "completed", completedAt: now };
}

export function skipStep(step: OnboardingStep): OnboardingStep {
  if (!step.skippable) throw new Error(`Step ${step.id} is not skippable`);
  return { ...step, status: "skipped" };
}

export function startStep(step: OnboardingStep): OnboardingStep {
  if (step.status !== "pending") return step;
  return { ...step, status: "in_progress" };
}

export function isStepDone(step: OnboardingStep): boolean {
  return step.status === "completed" || step.status === "skipped";
}
