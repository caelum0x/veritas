// Zod request/response schemas for the onboarding feature HTTP layer.
import { z } from "zod";
import { StepKind } from "@veritas/onboarding";

export const CreateFlowBodySchema = z.object({
  userId: z.string().min(1),
  organizationId: z.string().nullable().default(null),
  name: z.string().min(1),
  description: z.string().default(""),
  templateId: z.string().nullable().default(null),
  metadata: z.record(z.unknown()).default({}),
});
export type CreateFlowBody = z.infer<typeof CreateFlowBodySchema>;

export const AddStepBodySchema = z.object({
  kind: StepKind,
  title: z.string().min(1),
  description: z.string().default(""),
  order: z.number().int().nonnegative(),
  required: z.boolean().default(true),
  skippable: z.boolean().default(false),
  metadata: z.record(z.unknown()).default({}),
});
export type AddStepBody = z.infer<typeof AddStepBodySchema>;

export const FlowParamsSchema = z.object({
  flowId: z.string().min(1),
});
export type FlowParams = z.infer<typeof FlowParamsSchema>;

export const StepParamsSchema = z.object({
  flowId: z.string().min(1),
  stepId: z.string().min(1),
});
export type StepParams = z.infer<typeof StepParamsSchema>;

export const UserQuerySchema = z.object({
  userId: z.string().min(1),
});
export type UserQuery = z.infer<typeof UserQuerySchema>;
