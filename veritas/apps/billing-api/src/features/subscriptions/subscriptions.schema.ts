// Zod schemas for subscription request/response validation.

import { z } from "zod";

export const ListPlansQuerySchema = z.object({
  active: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
});

export const GetPlanParamsSchema = z.object({
  planId: z.string().min(1),
});

export const CreateSubscriptionBodySchema = z.object({
  organizationId: z.string().regex(/^org_/, "Must be a valid org id"),
  planId: z.string().min(1),
  currentPeriodStart: z.string().datetime(),
  currentPeriodEnd: z.string().datetime(),
});

export const UpdateSubscriptionBodySchema = z.object({
  status: z
    .enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED"])
    .optional(),
  planId: z.string().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

export const CancelSubscriptionBodySchema = z.object({
  immediately: z.boolean().default(false),
});

export const SubscriptionParamsSchema = z.object({
  subscriptionId: z.string().regex(/^sub_/, "Must be a valid subscription id"),
});

export const ListSubscriptionsQuerySchema = z.object({
  organizationId: z.string().optional(),
  status: z
    .enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export type CreateSubscriptionBody = z.infer<typeof CreateSubscriptionBodySchema>;
export type UpdateSubscriptionBody = z.infer<typeof UpdateSubscriptionBodySchema>;
export type CancelSubscriptionBody = z.infer<typeof CancelSubscriptionBodySchema>;
export type SubscriptionParams = z.infer<typeof SubscriptionParamsSchema>;
export type ListSubscriptionsQuery = z.infer<typeof ListSubscriptionsQuerySchema>;
