// Shared type aliases and value-object schemas for the onboarding module.
import { z } from "zod";

export const FlowId = z.string().brand<"FlowId">();
export type FlowId = z.infer<typeof FlowId>;

export const StepId = z.string().brand<"StepId">();
export type StepId = z.infer<typeof StepId>;

export const TemplateId = z.string().brand<"TemplateId">();
export type TemplateId = z.infer<typeof TemplateId>;

/** A percentage value in [0, 100]. */
export const PercentSchema = z.number().int().min(0).max(100);
export type Percent = z.infer<typeof PercentSchema>;

/** Context passed to trigger evaluation functions. */
export const TriggerContextSchema = z.object({
  userId: z.string(),
  organizationId: z.string().nullable(),
  flowId: z.string(),
  stepId: z.string(),
  metadata: z.record(z.unknown()).default({}),
});
export type TriggerContext = z.infer<typeof TriggerContextSchema>;

/** Reward granted upon flow completion. */
export const RewardKind = z.enum(["badge", "credit", "feature_unlock", "none"]);
export type RewardKind = z.infer<typeof RewardKind>;

export const RewardSchema = z.object({
  kind: RewardKind,
  label: z.string(),
  value: z.unknown().optional(),
});
export type Reward = z.infer<typeof RewardSchema>;

/** Minimal record written to the progress store. */
export const ProgressEntrySchema = z.object({
  flowId: z.string(),
  userId: z.string(),
  organizationId: z.string().nullable(),
  percentComplete: PercentSchema,
  allRequiredDone: z.boolean(),
  completedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
});
export type ProgressEntry = z.infer<typeof ProgressEntrySchema>;
