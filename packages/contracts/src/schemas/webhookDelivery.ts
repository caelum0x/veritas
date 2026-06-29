// WebhookDelivery entity: a single attempt to deliver an event to a webhook.

import { z } from "zod";
import { idSchema, timestampsSchema } from "./common.js";

export const WebhookDeliveryStatusSchema = z.enum([
  "PENDING",
  "SUCCEEDED",
  "FAILED",
  "RETRYING",
]);
export type WebhookDeliveryStatus = z.infer<
  typeof WebhookDeliveryStatusSchema
>;

export const WebhookDeliverySchema = z
  .object({
    id: idSchema("whd"),
    webhookId: idSchema("whk"),
    eventId: idSchema("evt"),
    eventType: z.string(),
    status: WebhookDeliveryStatusSchema,
    attempt: z.number().int().min(0),
    responseStatus: z.number().int().nullable(),
    error: z.string().nullable(),
    payloadHash: z.string(),
    nextRetryAt: z.string().nullable(),
    deliveredAt: z.string().nullable(),
  })
  .merge(timestampsSchema);
export type WebhookDelivery = z.infer<typeof WebhookDeliverySchema>;

export const CreateWebhookDeliverySchema = z.object({
  webhookId: idSchema("whk"),
  eventId: idSchema("evt"),
  eventType: z.string(),
  payloadHash: z.string(),
});
export type CreateWebhookDelivery = z.infer<
  typeof CreateWebhookDeliverySchema
>;
