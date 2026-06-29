// notification-bridge.ts: translates domain events into notifications via NotificationSender.

import type { DomainEvent, Logger, Result } from "@veritas/core";
import { ok, err, noopLogger, newId, epochToIso } from "@veritas/core";
import type { NotificationSender } from "@veritas/notifications";
import type { Notification } from "@veritas/notifications";

/** Maps a domain event type to a human-readable title and body template resolver. */
export interface NotificationTemplate {
  readonly title: string;
  readonly body: (event: DomainEvent) => string;
}

/** Maps event type strings to notification template definitions. */
export type EventToTemplateMap = ReadonlyMap<string, NotificationTemplate>;

/** Provides the userId to notify for a given domain event. Returns undefined to skip. */
export type RecipientResolver = (event: DomainEvent) => string | undefined;

export interface NotificationBridgeOptions {
  readonly sender: NotificationSender;
  readonly templateMap: EventToTemplateMap;
  readonly recipientResolver: RecipientResolver;
  readonly logger?: Logger;
}

export interface NotificationBridgeResult {
  readonly sent: number;
  readonly skipped: number;
  readonly failed: number;
}

const defaultBody = (event: DomainEvent): string => `Event ${event.type} occurred.`;

/** Default event-to-template mapping for common domain events. */
export const DEFAULT_TEMPLATE_MAP: EventToTemplateMap = new Map<string, NotificationTemplate>([
  ["verification.completed", { title: "Verification completed", body: defaultBody }],
  ["verification.failed", { title: "Verification failed", body: defaultBody }],
  ["verification.started", { title: "Verification started", body: defaultBody }],
  ["job.completed", { title: "Job completed", body: defaultBody }],
  ["job.failed", { title: "Job failed", body: defaultBody }],
  ["order.created", { title: "Order created", body: defaultBody }],
  ["order.settled", { title: "Order settled", body: defaultBody }],
  ["order.cancelled", { title: "Order cancelled", body: defaultBody }],
  ["settlement.initiated", { title: "Settlement initiated", body: defaultBody }],
  ["settlement.confirmed", { title: "Settlement confirmed", body: defaultBody }],
  ["settlement.failed", { title: "Settlement failed", body: defaultBody }],
  ["invoice.created", { title: "Invoice created", body: defaultBody }],
  ["invoice.paid", { title: "Invoice paid", body: defaultBody }],
  ["usage.threshold_reached", { title: "Usage threshold reached", body: defaultBody }],
  ["claim.created", { title: "Claim created", body: defaultBody }],
]);

/**
 * NotificationBridge handles a domain event, resolves the recipient and template,
 * builds a Notification, and delegates delivery to NotificationSender.
 */
export class NotificationBridge {
  private readonly sender: NotificationSender;
  private readonly templateMap: EventToTemplateMap;
  private readonly recipientResolver: RecipientResolver;
  private readonly logger: Logger;

  constructor(options: NotificationBridgeOptions) {
    this.sender = options.sender;
    this.templateMap = options.templateMap;
    this.recipientResolver = options.recipientResolver;
    this.logger = options.logger ?? noopLogger;
  }

  async handle(event: DomainEvent): Promise<Result<NotificationBridgeResult, Error>> {
    const template = this.templateMap.get(event.type);
    if (template === undefined) {
      return ok({ sent: 0, skipped: 1, failed: 0 });
    }

    const userId = this.recipientResolver(event);
    if (userId === undefined) {
      this.logger.debug("NotificationBridge: no recipient resolved, skipping", { eventType: event.type });
      return ok({ sent: 0, skipped: 1, failed: 0 });
    }

    const now = epochToIso(Date.now());
    const notification: Notification = {
      id: newId("ntf") as Notification["id"],
      userId: userId as Notification["userId"],
      channel: "IN_APP",
      type: event.type,
      title: template.title,
      body: template.body(event),
      readAt: null,
      sentAt: null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const result = await this.sender.send(notification);
      const failed = result.failed.length;
      const sent = result.succeeded.length;

      if (failed > 0) {
        this.logger.warn("NotificationBridge: some channels failed", {
          eventType: event.type,
          notificationId: notification.id,
          failed: result.failed,
        });
      }

      this.logger.debug("NotificationBridge: notification dispatched", {
        eventType: event.type,
        notificationId: notification.id,
        succeeded: result.succeeded,
      });

      return ok({ sent, skipped: 0, failed });
    } catch (e) {
      const msg = `NotificationBridge: send threw for event ${event.type}: ${String(e)}`;
      this.logger.error(msg, { eventType: event.type, userId });
      return err(new Error(msg));
    }
  }
}
