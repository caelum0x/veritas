// Core domain types for the trials module
import type { UserId } from "@veritas/core";
import type { IsoTimestamp } from "@veritas/core";

export type TrialId = string & { readonly __brand: "TrialId" };

export function newTrialId(): TrialId {
  return `trial_${Date.now()}_${Math.random().toString(36).slice(2)}` as TrialId;
}

export type TrialStatus =
  | "active"
  | "expired"
  | "converted"
  | "extended"
  | "cancelled";

export interface Trial {
  readonly id: TrialId;
  readonly userId: UserId;
  readonly planId: string;
  readonly status: TrialStatus;
  readonly startsAt: IsoTimestamp;
  readonly expiresAt: IsoTimestamp;
  readonly extendedAt: IsoTimestamp | null;
  readonly convertedAt: IsoTimestamp | null;
  readonly cancelledAt: IsoTimestamp | null;
  readonly extensionCount: number;
  readonly remindersSent: readonly ReminderKind[];
  readonly metadata: Record<string, string>;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export type ReminderKind = "3day" | "1day" | "expired";

export interface ExtendTrialParams {
  readonly trialId: TrialId;
  readonly daysToAdd: number;
  readonly reason: string;
}

export interface SendReminderParams {
  readonly trialId: TrialId;
  readonly kind: ReminderKind;
}

export interface ConvertTrialParams {
  readonly trialId: TrialId;
  readonly planId: string;
}

export interface CreateTrialParams {
  readonly userId: UserId;
  readonly planId: string;
  readonly durationDays: number;
  readonly metadata?: Record<string, string>;
}
