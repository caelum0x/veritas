// Notification entity: an in-app/email message addressed to a user.

import { z } from "zod";
import { idSchema, timestampsSchema, metadataSchema } from "./common.js";

export const NotificationChannelSchema = z.enum([
  "IN_APP",
  "EMAIL",
  "WEBHOOK",
]);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

export const NotificationSchema = z
  .object({
    id: idSchema("ntf"),
    userId: idSchema("user"),
    channel: NotificationChannelSchema,
    type: z.string(),
    title: z.string(),
    body: z.string(),
    readAt: z.string().nullable(),
    sentAt: z.string().nullable(),
    metadata: metadataSchema.optional(),
  })
  .merge(timestampsSchema);
export type Notification = z.infer<typeof NotificationSchema>;

export const CreateNotificationSchema = z.object({
  userId: idSchema("user"),
  channel: NotificationChannelSchema,
  type: z.string(),
  title: z.string(),
  body: z.string(),
  metadata: metadataSchema.optional(),
});
export type CreateNotification = z.infer<typeof CreateNotificationSchema>;
