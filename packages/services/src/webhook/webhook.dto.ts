// Input/output DTOs for webhook application service use-cases.
import { z } from "zod";
import {
  WebhookSchema,
  CreateWebhookSchema,
  UpdateWebhookSchema,
  WebhookDeliverySchema,
  WebhookDeliveryStatusSchema,
} from "@veritas/contracts";

/** Input DTO for registering a new webhook endpoint. */
export const CreateWebhookInputSchema = CreateWebhookSchema;
export type CreateWebhookInput = z.infer<typeof CreateWebhookInputSchema>;

/** Input DTO for updating a webhook's URL, secret, or event filters. */
export const UpdateWebhookInputSchema = UpdateWebhookSchema;
export type UpdateWebhookInput = z.infer<typeof UpdateWebhookInputSchema>;

/** Query options for listing webhooks. */
export const ListWebhooksInputSchema = z.object({
  orgId: z.string().optional(),
  enabled: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListWebhooksInput = z.infer<typeof ListWebhooksInputSchema>;

/** Query options for listing webhook deliveries. */
export const ListWebhookDeliveriesInputSchema = z.object({
  webhookId: z.string().min(1),
  status: WebhookDeliveryStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListWebhookDeliveriesInput = z.infer<typeof ListWebhookDeliveriesInputSchema>;

/** Input DTO for manually retrying a failed delivery. */
export const RetryWebhookDeliveryInputSchema = z.object({
  deliveryId: z.string().min(1),
});
export type RetryWebhookDeliveryInput = z.infer<typeof RetryWebhookDeliveryInputSchema>;

/** Output DTO: a single webhook record. */
export const WebhookOutputSchema = WebhookSchema;
export type WebhookOutput = z.infer<typeof WebhookOutputSchema>;

/** Output DTO: a single webhook delivery record. */
export const WebhookDeliveryOutputSchema = WebhookDeliverySchema;
export type WebhookDeliveryOutput = z.infer<typeof WebhookDeliveryOutputSchema>;

/** Output DTO: paginated list of webhooks. */
export const WebhookListOutputSchema = z.object({
  items: z.array(WebhookSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});
export type WebhookListOutput = z.infer<typeof WebhookListOutputSchema>;

/** Output DTO: paginated list of webhook deliveries. */
export const WebhookDeliveryListOutputSchema = z.object({
  items: z.array(WebhookDeliverySchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});
export type WebhookDeliveryListOutput = z.infer<typeof WebhookDeliveryListOutputSchema>;

/** Factory to produce a canonical WebhookOutput from a raw record. */
export function toWebhookOutput(webhook: WebhookOutput): WebhookOutput {
  return { ...webhook };
}
