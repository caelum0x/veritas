// Dunning reminders — composes and dispatches subscriber notifications during a dunning cycle.

import { newId, epochToIso } from "@veritas/core";
import type { DunningReminder, ReminderId, DunningId, DunningChannel } from "./types.js";
import type { DunningNotifier } from "./types.js";

/** Config for a single reminder event in the schedule. */
export interface ReminderConfig {
  /** Attempt number after which this reminder should be sent (0-based). */
  readonly afterAttemptNumber: number;
  /** Days until cancellation to communicate in the message. */
  readonly daysUntilCancellation: number;
  /** Channel to send the reminder on. */
  readonly channel: DunningChannel;
  /** Subject line for the reminder. */
  readonly subject: string;
}

/** Default reminder schedule aligned to the standard retry schedule. */
export const DEFAULT_REMINDER_CONFIGS: readonly ReminderConfig[] = [
  {
    afterAttemptNumber: 0,
    daysUntilCancellation: 7,
    channel: "EMAIL",
    subject: "Action required: Payment failed for your subscription",
  },
  {
    afterAttemptNumber: 1,
    daysUntilCancellation: 5,
    channel: "EMAIL",
    subject: "Reminder: Please update your payment method",
  },
  {
    afterAttemptNumber: 2,
    daysUntilCancellation: 2,
    channel: "EMAIL",
    subject: "Urgent: Your subscription will be cancelled soon",
  },
  {
    afterAttemptNumber: 3,
    daysUntilCancellation: 0,
    channel: "EMAIL",
    subject: "Final notice: Your subscription has been suspended",
  },
];

/** Builds a reminder record without dispatching it. */
export function buildReminder(params: {
  dunningId: DunningId;
  config: ReminderConfig;
}): DunningReminder {
  return {
    id: newId("rmd") as unknown as ReminderId,
    dunningId: params.dunningId,
    channel: params.config.channel,
    sentAt: epochToIso(Date.now()),
    subject: params.config.subject,
    daysUntilCancellation: params.config.daysUntilCancellation,
  };
}

/**
 * Sends a reminder for a given attempt number via the notifier port.
 * Returns null if no reminder is configured for this attempt number.
 */
export async function dispatchReminder(
  dunningId: DunningId,
  attemptNumber: number,
  notifier: DunningNotifier,
  configs: readonly ReminderConfig[] = DEFAULT_REMINDER_CONFIGS
): Promise<DunningReminder | null> {
  const config = configs.find((c) => c.afterAttemptNumber === attemptNumber);
  if (!config) {
    return null;
  }

  await notifier.sendPaymentFailedReminder(
    dunningId,
    config.channel,
    config.daysUntilCancellation
  );

  return buildReminder({ dunningId, config });
}

/**
 * Sends a cancellation warning reminder when the subscription is near termination.
 */
export async function dispatchCancellationWarning(
  dunningId: DunningId,
  channel: DunningChannel,
  notifier: DunningNotifier
): Promise<DunningReminder> {
  await notifier.sendCancellationWarning(dunningId, channel);
  return buildReminder({
    dunningId,
    config: {
      afterAttemptNumber: -1,
      daysUntilCancellation: 0,
      channel,
      subject: "Your subscription has been cancelled due to non-payment",
    },
  });
}

/**
 * Sends a recovery confirmation when payment eventually succeeds.
 */
export async function dispatchRecoveryConfirmation(
  dunningId: DunningId,
  channel: DunningChannel,
  notifier: DunningNotifier
): Promise<DunningReminder> {
  await notifier.sendRecoveryConfirmation(dunningId, channel);
  return buildReminder({
    dunningId,
    config: {
      afterAttemptNumber: -1,
      daysUntilCancellation: -1,
      channel,
      subject: "Payment successful — your subscription has been restored",
    },
  });
}

/** No-op notifier for use in tests and local development. */
export class NoopDunningNotifier implements DunningNotifier {
  async sendPaymentFailedReminder(
    _dunningId: DunningId,
    _channel: DunningChannel,
    _daysLeft: number
  ): Promise<void> {}

  async sendRecoveryConfirmation(
    _dunningId: DunningId,
    _channel: DunningChannel
  ): Promise<void> {}

  async sendCancellationWarning(
    _dunningId: DunningId,
    _channel: DunningChannel
  ): Promise<void> {}
}
