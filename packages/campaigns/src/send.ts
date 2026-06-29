// Sends campaign messages to recipients via the notifications package.

import { ok, err, newId, epochToIso, type Result, type Logger, noopLogger } from "@veritas/core";
import { NotificationSender } from "@veritas/notifications";
import type { Notification } from "@veritas/notifications";
import type { Campaign } from "./campaign.js";
import type { MessageVariant, MetricEvent } from "./types.js";
import { AudienceEmptyError, CampaignValidationError } from "./errors.js";

export interface SendOptions {
  sender: NotificationSender;
  logger?: Logger;
}

export interface RecipientMessage {
  readonly recipientId: string;
  readonly address: string;
  readonly variant: MessageVariant;
}

export interface SendCampaignResult {
  readonly campaignId: string;
  readonly totalSent: number;
  readonly totalFailed: number;
  readonly events: ReadonlyArray<MetricEvent>;
}

function buildNotification(
  campaign: Campaign,
  recipient: RecipientMessage,
): Notification {
  const now = epochToIso(Date.now());
  return {
    id: newId("notif"),
    userId: recipient.recipientId,
    orgId: campaign.orgId,
    channel: campaign.channel === "in_app" ? "in_app" : campaign.channel,
    subject: recipient.variant.subject,
    body: recipient.variant.body,
    html: recipient.variant.html,
    createdAt: now,
    updatedAt: now,
    metadata: { campaignId: campaign.id, variantId: recipient.variant.id },
  } as unknown as Notification;
}

/** Dispatches campaign messages to a batch of recipients and returns metric events. */
export async function sendCampaignBatch(
  campaign: Campaign,
  recipients: ReadonlyArray<RecipientMessage>,
  options: SendOptions,
): Promise<Result<SendCampaignResult, AudienceEmptyError | CampaignValidationError>> {
  const logger = options.logger ?? noopLogger;

  if (recipients.length === 0) {
    return err(new AudienceEmptyError(campaign.id));
  }

  const events: MetricEvent[] = [];
  let totalSent = 0;
  let totalFailed = 0;
  const now = epochToIso(Date.now());

  await Promise.all(
    recipients.map(async (recipient) => {
      const notification = buildNotification(campaign, recipient);
      try {
        const result = await options.sender.send(notification);
        if (result.succeeded.length > 0) {
          totalSent++;
          events.push({
            campaignId: campaign.id,
            recipientId: recipient.recipientId,
            variantId: recipient.variant.id,
            event: "sent",
            occurredAt: now,
          });
        } else {
          totalFailed++;
          logger.warn("All channels failed for recipient", {
            campaignId: campaign.id,
            recipientId: recipient.recipientId,
            failed: result.failed,
          });
        }
      } catch (e) {
        totalFailed++;
        logger.error("Unexpected send error", {
          campaignId: campaign.id,
          recipientId: recipient.recipientId,
          error: e,
        });
      }
    }),
  );

  return ok({ campaignId: campaign.id, totalSent, totalFailed, events });
}
