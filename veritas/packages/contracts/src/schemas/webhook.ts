// Webhook entity: a subscriber endpoint receiving Veritas event notifications.

import { z } from "zod";
import {
  idSchema,
  timestampsSchema,
  urlSchema,
  metadataSchema,
} from "./common.js";

export const WebhookSchema = z
  .object({
    id: idSchema("whk"),
    organizationId: idSchema("org"),
    url: urlSchema,
    events: z.array(z.string()),
    secret: z.string(),
    active: z.boolean(),
    description: z.string().nullable(),
    metadata: metadataSchema.optional(),
  })
  .merge(timestampsSchema);
export type Webhook = z.infer<typeof WebhookSchema>;

export const CreateWebhookSchema = z.object({
  organizationId: idSchema("org"),
  url: urlSchema,
  events: z.array(z.string()).min(1),
  description: z.string().nullable().optional(),
  metadata: metadataSchema.optional(),
});
export type CreateWebhook = z.infer<typeof CreateWebhookSchema>;

export const UpdateWebhookSchema = z.object({
  url: urlSchema.optional(),
  events: z.array(z.string()).min(1).optional(),
  active: z.boolean().optional(),
  description: z.string().nullable().optional(),
});
export type UpdateWebhook = z.infer<typeof UpdateWebhookSchema>;
