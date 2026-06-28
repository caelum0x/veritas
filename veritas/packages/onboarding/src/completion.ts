// Defines completion rewards granted when an onboarding flow finishes.
import { z } from "zod";
import { newId } from "@veritas/core";
import { type OnboardingFlow } from "./flow.js";

export const RewardKind = z.enum([
  "badge",
  "credit",
  "feature_unlock",
  "discount",
  "notification",
]);
export type RewardKind = z.infer<typeof RewardKind>;

export const CompletionRewardSchema = z.object({
  id: z.string(),
  flowId: z.string(),
  userId: z.string(),
  kind: RewardKind,
  label: z.string().min(1),
  value: z.unknown().nullable().default(null),
  grantedAt: z.string().datetime(),
  metadata: z.record(z.unknown()).default({}),
});
export type CompletionReward = z.infer<typeof CompletionRewardSchema>;

export const RewardDefinitionSchema = z.object({
  kind: RewardKind,
  label: z.string().min(1),
  value: z.unknown().nullable().default(null),
  metadata: z.record(z.unknown()).default({}),
});
export type RewardDefinition = z.infer<typeof RewardDefinitionSchema>;

export function grantRewards(
  flow: OnboardingFlow,
  definitions: ReadonlyArray<RewardDefinition>,
  now: string,
): ReadonlyArray<CompletionReward> {
  return definitions.map((def) =>
    CompletionRewardSchema.parse({
      id: newId("reward"),
      flowId: flow.id,
      userId: flow.userId,
      kind: def.kind,
      label: def.label,
      value: def.value ?? null,
      grantedAt: now,
      metadata: def.metadata ?? {},
    }),
  );
}

export function isFlowEligibleForRewards(flow: OnboardingFlow): boolean {
  return flow.status === "completed";
}

export const DEFAULT_COMPLETION_REWARDS: ReadonlyArray<RewardDefinition> = [
  {
    kind: "badge",
    label: "Onboarding Complete",
    value: "onboarding_complete",
    metadata: {},
  },
  {
    kind: "notification",
    label: "Welcome to Veritas!",
    value: null,
    metadata: {},
  },
];
