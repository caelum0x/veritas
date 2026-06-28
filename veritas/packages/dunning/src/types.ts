// Shared value types, branded IDs, and domain interfaces for the dunning module.

import { z } from "zod";
import type { IsoTimestamp } from "@veritas/core";
import { newId } from "@veritas/core";

/** Branded ID for a dunning process record. */
export type DunningId = string & { readonly _brand: "DunningId" };
export const newDunningId = (): DunningId => newId("dng") as unknown as DunningId;

/** Branded ID for a payment attempt record. */
export type AttemptId = string & { readonly _brand: "AttemptId" };
export const newAttemptId = (): AttemptId => newId("att") as unknown as AttemptId;

/** Branded ID for a dunning reminder. */
export type ReminderId = string & { readonly _brand: "ReminderId" };
export const newReminderId = (): ReminderId => newId("rmd") as unknown as ReminderId;

/** Branded ID for a recovery record. */
export type RecoveryId = string & { readonly _brand: "RecoveryId" };
export const newRecoveryId = (): RecoveryId => newId("rec") as unknown as RecoveryId;

/** Overall dunning lifecycle status. */
export const DunningStatusSchema = z.enum([
  "ACTIVE",
  "PAUSED",
  "RECOVERED",
  "CANCELLED",
  "EXHAUSTED",
]);
export type DunningStatus = z.infer<typeof DunningStatusSchema>;

/** Outcome of a single payment retry attempt. */
export const AttemptOutcomeSchema = z.enum([
  "SUCCESS",
  "DECLINED",
  "INSUFFICIENT_FUNDS",
  "NETWORK_ERROR",
  "EXPIRED_CARD",
  "DO_NOT_HONOR",
  "PENDING",
]);
export type AttemptOutcome = z.infer<typeof AttemptOutcomeSchema>;

/** Reason a dunning process was cancelled or completed. */
export const DunningResolutionSchema = z.enum([
  "PAYMENT_RECOVERED",
  "SUBSCRIPTION_CANCELLED",
  "MANUALLY_RESOLVED",
  "MAX_ATTEMPTS_REACHED",
]);
export type DunningResolution = z.infer<typeof DunningResolutionSchema>;

/** Dunning notification channel. */
export const DunningChannelSchema = z.enum(["EMAIL", "IN_APP", "SMS"]);
export type DunningChannel = z.infer<typeof DunningChannelSchema>;

/** Single payment attempt within a dunning cycle. */
export interface DunningAttempt {
  readonly id: AttemptId;
  readonly dunningId: DunningId;
  readonly attemptNumber: number;
  readonly outcome: AttemptOutcome;
  readonly amountCents: number;
  readonly currency: string;
  readonly attemptedAt: IsoTimestamp;
  readonly nextRetryAt?: IsoTimestamp;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

/** Reminder message sent to the subscriber during dunning. */
export interface DunningReminder {
  readonly id: ReminderId;
  readonly dunningId: DunningId;
  readonly channel: DunningChannel;
  readonly sentAt: IsoTimestamp;
  readonly subject: string;
  readonly daysUntilCancellation: number;
}

/** Parameters for filtering dunning records. */
export const DunningListParamsSchema = z.object({
  subscriptionId: z.string().optional(),
  organizationId: z.string().optional(),
  status: DunningStatusSchema.optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
export type DunningListParams = z.infer<typeof DunningListParamsSchema>;

/** Port interface for sending dunning-related notifications. */
export interface DunningNotifier {
  sendPaymentFailedReminder(dunningId: DunningId, channel: DunningChannel, daysLeft: number): Promise<void>;
  sendRecoveryConfirmation(dunningId: DunningId, channel: DunningChannel): Promise<void>;
  sendCancellationWarning(dunningId: DunningId, channel: DunningChannel): Promise<void>;
}
