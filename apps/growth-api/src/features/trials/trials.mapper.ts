// Maps @veritas/trials domain types to HTTP response shapes.
import type { Trial } from "@veritas/trials";

export interface TrialResponse {
  readonly id: string;
  readonly userId: string;
  readonly planId: string;
  readonly status: Trial["status"];
  readonly startsAt: string;
  readonly expiresAt: string;
  readonly extendedAt: string | null;
  readonly convertedAt: string | null;
  readonly cancelledAt: string | null;
  readonly extensionCount: number;
  readonly remindersSent: readonly string[];
  readonly metadata: Record<string, string>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EligibilityResponse {
  readonly eligible: boolean;
  readonly reason: string | null;
}

export function toTrialResponse(trial: Trial): TrialResponse {
  return {
    id: trial.id,
    userId: trial.userId,
    planId: trial.planId,
    status: trial.status,
    startsAt: trial.startsAt,
    expiresAt: trial.expiresAt,
    extendedAt: trial.extendedAt,
    convertedAt: trial.convertedAt,
    cancelledAt: trial.cancelledAt,
    extensionCount: trial.extensionCount,
    remindersSent: trial.remindersSent,
    metadata: trial.metadata,
    createdAt: trial.createdAt,
    updatedAt: trial.updatedAt,
  };
}

export function toEligibilityResponse(eligible: boolean, reason: string | null): EligibilityResponse {
  return { eligible, reason };
}
