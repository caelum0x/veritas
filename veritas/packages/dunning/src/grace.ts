// Grace period computation and enforcement for failed subscription payments.

import { z } from "zod";
import { ok, err, epochToIso, isoToEpoch, systemClock, type Result, type IsoTimestamp, type Clock } from "@veritas/core";
import { InvalidGracePeriodError } from "./errors.js";

/** Configuration for a grace period applied after payment failure. */
export const GracePeriodConfigSchema = z.object({
  durationDays: z.number().int().min(1).max(90),
  warningThresholdDays: z.number().int().min(0),
  allowFeatureAccess: z.boolean(),
});
export type GracePeriodConfig = z.infer<typeof GracePeriodConfigSchema>;

/** Snapshot of an active or expired grace period. */
export interface GracePeriod {
  readonly startsAt: IsoTimestamp;
  readonly endsAt: IsoTimestamp;
  readonly durationDays: number;
  readonly allowFeatureAccess: boolean;
  readonly warningThresholdDays: number;
}

/** Result of evaluating whether a grace period is still active. */
export interface GracePeriodStatus {
  readonly isActive: boolean;
  readonly isExpired: boolean;
  readonly daysRemaining: number;
  readonly isInWarningPeriod: boolean;
}

/** Default grace period used when no custom config is provided. */
export const DEFAULT_GRACE_PERIOD_CONFIG: GracePeriodConfig = {
  durationDays: 14,
  warningThresholdDays: 3,
  allowFeatureAccess: true,
};

const MS_PER_DAY = 86_400_000;

/** Validate a grace period config and return it or an error. */
export function validateGracePeriodConfig(config: GracePeriodConfig): Result<GracePeriodConfig> {
  if (config.warningThresholdDays >= config.durationDays) {
    return err(
      new InvalidGracePeriodError(
        `warningThresholdDays (${config.warningThresholdDays}) must be less than durationDays (${config.durationDays})`
      )
    );
  }
  return ok(config);
}

/** Create a grace period starting at a given timestamp using the supplied config. */
export function createGracePeriod(
  startsAt: IsoTimestamp,
  config: GracePeriodConfig = DEFAULT_GRACE_PERIOD_CONFIG
): Result<GracePeriod> {
  const validation = validateGracePeriodConfig(config);
  if (!validation.ok) return validation;

  const startMs = isoToEpoch(startsAt) ?? Date.now();
  const endMs = startMs + config.durationDays * MS_PER_DAY;

  return ok({
    startsAt,
    endsAt: epochToIso(endMs),
    durationDays: config.durationDays,
    allowFeatureAccess: config.allowFeatureAccess,
    warningThresholdDays: config.warningThresholdDays,
  });
}

/** Evaluate the current status of a grace period relative to a point in time. */
export function evaluateGracePeriod(
  grace: GracePeriod,
  clock: Clock = systemClock
): GracePeriodStatus {
  const nowMs = clock.now();
  const endMs = isoToEpoch(grace.endsAt) ?? nowMs;
  const remainingMs = endMs - nowMs;
  const daysRemaining = Math.max(0, Math.ceil(remainingMs / MS_PER_DAY));
  const isActive = remainingMs > 0;
  const isExpired = !isActive;
  const isInWarningPeriod = isActive && daysRemaining <= grace.warningThresholdDays;

  return { isActive, isExpired, daysRemaining, isInWarningPeriod };
}

/** Extend a grace period by adding extra days, returning a new GracePeriod. */
export function extendGracePeriod(grace: GracePeriod, extraDays: number): Result<GracePeriod> {
  if (extraDays <= 0) {
    return err(new InvalidGracePeriodError(`extraDays must be positive, got ${extraDays}`));
  }
  const endMs = (isoToEpoch(grace.endsAt) ?? Date.now()) + extraDays * MS_PER_DAY;
  return ok({
    ...grace,
    endsAt: epochToIso(endMs),
    durationDays: grace.durationDays + extraDays,
  });
}
