// Input/output DTOs for notification use-cases.
import { z } from "zod";
import { NotificationSchema, CreateNotificationSchema, NotificationChannelSchema } from "@veritas/contracts";

/** DTO for creating a new notification. */
export const CreateNotificationInputSchema = CreateNotificationSchema;
export type CreateNotificationInput = z.infer<typeof CreateNotificationInputSchema>;

/** DTO for updating mutable notification fields (read status, sentAt). */
export const UpdateNotificationInputSchema = z.object({
  readAt: z.string().nullable().optional(),
  sentAt: z.string().nullable().optional(),
  title: z.string().optional(),
  body: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type UpdateNotificationInput = z.infer<typeof UpdateNotificationInputSchema>;

/** DTO for filtering notifications in list queries. */
export const ListNotificationsInputSchema = z.object({
  userId: z.string().optional(),
  channel: NotificationChannelSchema.optional(),
  type: z.string().optional(),
  unreadOnly: z.boolean().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
export type ListNotificationsInput = z.infer<typeof ListNotificationsInputSchema>;

/** Output DTO representing a single notification. */
export const NotificationOutputSchema = NotificationSchema;
export type NotificationOutput = z.infer<typeof NotificationOutputSchema>;
