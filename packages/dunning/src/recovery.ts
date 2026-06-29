// Recovery tracking for subscriptions that exit dunning after a successful payment.

import { z } from "zod";
import { ok, epochToIso, systemClock, isoToEpoch, type IsoTimestamp, type Clock } from "@veritas/core";
import { newRecoveryId, type RecoveryId, type DunningId } from "./types.js";
export type { RecoveryId };

/** How a subscription was recovered from a dunning state. */
export const RecoveryMethodSchema = z.enum([
  "AUTOMATIC_RETRY",
  "MANUAL_PAYMENT",
  "CARD_UPDATED",
  "PLAN_DOWNGRADE",
  "COUPON_APPLIED",
]);
export type RecoveryMethod = z.infer<typeof RecoveryMethodSchema>;

/** Immutable record of a successful recovery from dunning. */
export interface RecoveryRecord {
  readonly id: RecoveryId;
  readonly dunningId: DunningId;
  readonly subscriptionId: string;
  readonly organizationId: string;
  readonly recoveredAt: IsoTimestamp;
  readonly method: RecoveryMethod;
  readonly attemptNumber: number;
  readonly amountCents: number;
  readonly currency: string;
  readonly totalDaysInDunning: number;
  readonly notes?: string;
}

/** Input required to create a new recovery record. */
export interface CreateRecoveryInput {
  readonly dunningId: DunningId;
  readonly subscriptionId: string;
  readonly organizationId: string;
  readonly dunningStartedAt: IsoTimestamp;
  readonly method: RecoveryMethod;
  readonly attemptNumber: number;
  readonly amountCents: number;
  readonly currency: string;
  readonly notes?: string;
}

/** Statistics about recovery outcomes for a set of records. */
export interface RecoveryStats {
  readonly totalRecoveries: number;
  readonly byMethod: Readonly<Record<RecoveryMethod, number>>;
  readonly averageDaysToRecovery: number;
  readonly medianAttemptNumber: number;
}

/** Build a new immutable RecoveryRecord from the given input. */
export function createRecoveryRecord(
  input: CreateRecoveryInput,
  clock: Clock = systemClock
): RecoveryRecord {
  const nowMs = clock.now();
  const startMs = isoToEpoch(input.dunningStartedAt) ?? nowMs;
  const totalDaysInDunning = Math.max(0, Math.ceil((nowMs - startMs) / 86_400_000));

  return {
    id: newRecoveryId(),
    dunningId: input.dunningId,
    subscriptionId: input.subscriptionId,
    organizationId: input.organizationId,
    recoveredAt: epochToIso(nowMs),
    method: input.method,
    attemptNumber: input.attemptNumber,
    amountCents: input.amountCents,
    currency: input.currency,
    totalDaysInDunning,
    notes: input.notes,
  };
}

/** Aggregate recovery records into summary statistics. */
export function computeRecoveryStats(records: readonly RecoveryRecord[]): RecoveryStats {
  if (records.length === 0) {
    return {
      totalRecoveries: 0,
      byMethod: {
        AUTOMATIC_RETRY: 0,
        MANUAL_PAYMENT: 0,
        CARD_UPDATED: 0,
        PLAN_DOWNGRADE: 0,
        COUPON_APPLIED: 0,
      },
      averageDaysToRecovery: 0,
      medianAttemptNumber: 0,
    };
  }

  const byMethod: Record<RecoveryMethod, number> = {
    AUTOMATIC_RETRY: 0,
    MANUAL_PAYMENT: 0,
    CARD_UPDATED: 0,
    PLAN_DOWNGRADE: 0,
    COUPON_APPLIED: 0,
  };

  let totalDays = 0;
  const attemptNumbers: number[] = [];

  for (const r of records) {
    byMethod[r.method] = (byMethod[r.method] ?? 0) + 1;
    totalDays += r.totalDaysInDunning;
    attemptNumbers.push(r.attemptNumber);
  }

  attemptNumbers.sort((a, b) => a - b);
  const mid = Math.floor(attemptNumbers.length / 2);
  const medianAttemptNumber =
    attemptNumbers.length % 2 === 0
      ? Math.round(((attemptNumbers[mid - 1] ?? 0) + (attemptNumbers[mid] ?? 0)) / 2)
      : (attemptNumbers[mid] ?? 0);

  return {
    totalRecoveries: records.length,
    byMethod,
    averageDaysToRecovery: Math.round(totalDays / records.length),
    medianAttemptNumber,
  };
}
