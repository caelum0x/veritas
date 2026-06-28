// Defines reusable onboarding flow templates with predefined steps.
import { z } from "zod";
import { newId } from "@veritas/core";
import { StepKind, type CreateStep } from "./step.js";
import { type CreateFlow } from "./flow.js";
import { type RewardDefinition, DEFAULT_COMPLETION_REWARDS } from "./completion.js";

export const FlowTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().default(""),
  stepDefinitions: z.array(
    z.object({
      kind: StepKind,
      title: z.string().min(1),
      description: z.string().default(""),
      order: z.number().int().nonnegative(),
      required: z.boolean().default(true),
      skippable: z.boolean().default(false),
      metadata: z.record(z.unknown()).default({}),
    }),
  ),
  rewards: z.array(
    z.object({
      kind: z.string(),
      label: z.string(),
      value: z.unknown().nullable().default(null),
      metadata: z.record(z.unknown()).default({}),
    }),
  ).default([]),
  metadata: z.record(z.unknown()).default({}),
});
export type FlowTemplate = z.infer<typeof FlowTemplateSchema>;

type StepDefinition = FlowTemplate["stepDefinitions"][number];

export function templateToCreateFlow(
  template: FlowTemplate,
  userId: string,
  organizationId: string | null = null,
): CreateFlow {
  return {
    templateId: template.id,
    userId,
    organizationId,
    name: template.name,
    description: template.description,
    metadata: { ...template.metadata },
  };
}

export function templateStepsToCreateSteps(
  template: FlowTemplate,
  flowId: string,
): ReadonlyArray<CreateStep> {
  return template.stepDefinitions.map((def: StepDefinition) => ({
    flowId,
    kind: def.kind,
    title: def.title,
    description: def.description,
    order: def.order,
    required: def.required,
    skippable: def.skippable,
    metadata: { ...def.metadata },
  }));
}

export function templateRewards(template: FlowTemplate): ReadonlyArray<RewardDefinition> {
  if (template.rewards.length === 0) return DEFAULT_COMPLETION_REWARDS;
  return template.rewards as ReadonlyArray<RewardDefinition>;
}

export const STANDARD_ONBOARDING_TEMPLATE: FlowTemplate = FlowTemplateSchema.parse({
  id: newId("tmpl"),
  name: "Standard Onboarding",
  description: "Default onboarding flow for new Veritas users",
  stepDefinitions: [
    { kind: "profile_setup", title: "Complete your profile", description: "Add your name and photo", order: 0, required: true, skippable: false, metadata: {} },
    { kind: "email_verification", title: "Verify your email", description: "Confirm your email address", order: 1, required: true, skippable: false, metadata: {} },
    { kind: "plan_selection", title: "Choose a plan", description: "Select the plan that fits your needs", order: 2, required: true, skippable: false, metadata: {} },
    { kind: "api_key_creation", title: "Create an API key", description: "Generate your first API key to get started", order: 3, required: false, skippable: true, metadata: {} },
    { kind: "first_claim", title: "Submit your first claim", description: "Try submitting a claim for verification", order: 4, required: false, skippable: true, metadata: {} },
    { kind: "tour_completed", title: "Take the product tour", description: "Explore the key features of Veritas", order: 5, required: false, skippable: true, metadata: {} },
  ],
  rewards: [],
  metadata: {},
});

export const TEAM_ONBOARDING_TEMPLATE: FlowTemplate = FlowTemplateSchema.parse({
  id: newId("tmpl"),
  name: "Team Onboarding",
  description: "Onboarding flow for organizations setting up a team",
  stepDefinitions: [
    { kind: "profile_setup", title: "Complete your profile", description: "Add your name and photo", order: 0, required: true, skippable: false, metadata: {} },
    { kind: "email_verification", title: "Verify your email", description: "Confirm your email address", order: 1, required: true, skippable: false, metadata: {} },
    { kind: "plan_selection", title: "Choose a team plan", description: "Select the best plan for your team", order: 2, required: true, skippable: false, metadata: {} },
    { kind: "team_invite", title: "Invite your team", description: "Add teammates to your organization", order: 3, required: true, skippable: false, metadata: {} },
    { kind: "billing_setup", title: "Set up billing", description: "Configure payment for your team", order: 4, required: true, skippable: false, metadata: {} },
    { kind: "first_verification", title: "Run your first verification", description: "Verify a claim with your team", order: 5, required: false, skippable: true, metadata: {} },
  ],
  rewards: [],
  metadata: {},
});

export const BUILT_IN_TEMPLATES: ReadonlyMap<string, FlowTemplate> = new Map([
  [STANDARD_ONBOARDING_TEMPLATE.id, STANDARD_ONBOARDING_TEMPLATE],
  [TEAM_ONBOARDING_TEMPLATE.id, TEAM_ONBOARDING_TEMPLATE],
]);
