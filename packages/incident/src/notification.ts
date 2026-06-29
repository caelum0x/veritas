// Notify responders of incident events via configurable channel adapters.
import { z } from "zod";
import { type Result, ok, err, newId } from "@veritas/core";
import { type SeverityLevel } from "./severity.js";

export const NotificationChannelKindSchema = z.enum(["email", "sms", "slack", "webhook", "pagerduty"]);
export type NotificationChannelKind = z.infer<typeof NotificationChannelKindSchema>;

export const NotificationStatusSchema = z.enum(["pending", "sent", "failed", "suppressed"]);
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;

export const NotificationSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  recipientId: z.string(),
  channelKind: NotificationChannelKindSchema,
  subject: z.string(),
  body: z.string(),
  status: NotificationStatusSchema,
  sentAt: z.string().nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export interface NotificationPayload {
  readonly incidentId: string;
  readonly recipientId: string;
  readonly channelKind: NotificationChannelKind;
  readonly subject: string;
  readonly body: string;
}

export interface NotificationSender {
  readonly kind: NotificationChannelKind;
  send(payload: NotificationPayload): Promise<Result<void>>;
}

export interface InMemoryNotificationSender extends NotificationSender {
  readonly sent: readonly NotificationPayload[];
}

export function createInMemoryNotificationSender(
  kind: NotificationChannelKind,
  shouldFail = false,
): InMemoryNotificationSender {
  const sent: NotificationPayload[] = [];
  return {
    kind,
    sent,
    async send(payload: NotificationPayload): Promise<Result<void>> {
      if (shouldFail) {
        return err(new Error(`Simulated send failure for channel ${kind}`));
      }
      sent.push(payload);
      return ok(undefined);
    },
  };
}

export function buildNotification(payload: NotificationPayload, now: string): Notification {
  return {
    id: newId("notif"),
    incidentId: payload.incidentId,
    recipientId: payload.recipientId,
    channelKind: payload.channelKind,
    subject: payload.subject,
    body: payload.body,
    status: "pending",
    sentAt: null,
    failureReason: null,
    createdAt: now,
  };
}

export async function dispatchNotification(
  notification: Notification,
  sender: NotificationSender,
  now: string,
): Promise<Notification> {
  const payload: NotificationPayload = {
    incidentId: notification.incidentId,
    recipientId: notification.recipientId,
    channelKind: notification.channelKind,
    subject: notification.subject,
    body: notification.body,
  };
  const result = await sender.send(payload);
  if (result.ok) {
    return { ...notification, status: "sent", sentAt: now };
  }
  const reason = result.error instanceof Error ? result.error.message : String(result.error);
  return { ...notification, status: "failed", failureReason: reason };
}

export function buildIncidentPageMessage(opts: {
  readonly incidentId: string;
  readonly title: string;
  readonly severity: SeverityLevel;
  readonly declaredAt: string;
}): { readonly subject: string; readonly body: string } {
  const subject = `[${opts.severity}] Incident declared: ${opts.title}`;
  const body =
    `Incident ${opts.incidentId} has been declared at ${opts.declaredAt}.\n` +
    `Severity: ${opts.severity}\n` +
    `Title: ${opts.title}\n\n` +
    `Please acknowledge and join the incident channel immediately.`;
  return { subject, body };
}
