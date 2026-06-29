// Input/output DTOs for subscription application service use-cases.
import { z } from "zod";
import {
  SubscriptionSchema,
  CreateSubscriptionSchema,
  UpdateSubscriptionSchema,
  SubscriptionStatusSchema,
} from "@veritas/contracts";

/** Input DTO for creating a new subscription. */
export const CreateSubscriptionInputSchema = CreateSubscriptionSchema;
export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionInputSchema>;

/** Input DTO for updating a subscription (e.g. change plan, seats). */
export const UpdateSubscriptionInputSchema = UpdateSubscriptionSchema;
export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionInputSchema>;

/** Query options for listing subscriptions. */
export const ListSubscriptionsInputSchema = z.object({
  orgId: z.string().optional(),
  planId: z.string().optional(),
  status: SubscriptionStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListSubscriptionsInput = z.infer<typeof ListSubscriptionsInputSchema>;

/** Input DTO for cancelling a subscription. */
export const CancelSubscriptionInputSchema = z.object({
  subscriptionId: z.string().min(1),
  reason: z.string().max(500).optional(),
  cancelAtPeriodEnd: z.boolean().default(true),
});
export type CancelSubscriptionInput = z.infer<typeof CancelSubscriptionInputSchema>;

/** Input DTO for resuming a cancelled or paused subscription. */
export const ResumeSubscriptionInputSchema = z.object({
  subscriptionId: z.string().min(1),
});
export type ResumeSubscriptionInput = z.infer<typeof ResumeSubscriptionInputSchema>;

/** Output DTO: a single subscription record. */
export const SubscriptionOutputSchema = SubscriptionSchema;
export type SubscriptionOutput = z.infer<typeof SubscriptionOutputSchema>;

/** Output DTO: paginated list of subscriptions. */
export const SubscriptionListOutputSchema = z.object({
  items: z.array(SubscriptionSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});
export type SubscriptionListOutput = z.infer<typeof SubscriptionListOutputSchema>;

/** Factory to produce a canonical SubscriptionOutput from a raw record. */
export function toSubscriptionOutput(sub: SubscriptionOutput): SubscriptionOutput {
  return { ...sub };
}
