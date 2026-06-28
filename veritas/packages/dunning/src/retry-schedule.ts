// Smart retry schedule — computes next payment attempt dates using configurable back-off intervals.

import { Result, ok, err } from "@veritas/core";
import { InvalidRetryScheduleError } from "./errors.js";

/** Describes when each retry attempt should be made relative to initial failure. */
export interface RetrySchedule {
  /** Delay in hours from the previous event for each attempt (index = attempt number, 0-based). */
  readonly delaysHours: readonly number[];
  /** Human-readable label for the schedule. */
  readonly label: string;
}

/** Default retry schedule: attempt immediately, then 1d, 3d, 7d. */
export const DEFAULT_RETRY_SCHEDULE: RetrySchedule = {
  label: "standard",
  delaysHours: [0, 24, 72, 168],
};

/** Aggressive short retry schedule for high-value accounts. */
export const SHORT_RETRY_SCHEDULE: RetrySchedule = {
  label: "aggressive",
  delaysHours: [0, 12, 36, 72],
};

/** Lenient retry schedule for annual plan subscribers. */
export const LENIENT_RETRY_SCHEDULE: RetrySchedule = {
  label: "lenient",
  delaysHours: [0, 48, 120, 240, 336],
};

/** Maximum allowed attempts in a retry schedule. */
const MAX_ALLOWED_ATTEMPTS = 10;

/** Validates a retry schedule definition for internal correctness. */
export function validateRetrySchedule(
  schedule: RetrySchedule
): Result<RetrySchedule, InvalidRetryScheduleError> {
  if (schedule.delaysHours.length === 0) {
    return err(new InvalidRetryScheduleError("must contain at least one delay entry"));
  }
  if (schedule.delaysHours.length > MAX_ALLOWED_ATTEMPTS) {
    return err(
      new InvalidRetryScheduleError(
        `exceeds max allowed attempts (${MAX_ALLOWED_ATTEMPTS})`
      )
    );
  }
  for (const hours of schedule.delaysHours) {
    if (!Number.isFinite(hours) || hours < 0) {
      return err(
        new InvalidRetryScheduleError(`delay hours must be non-negative finite numbers, got ${hours}`)
      );
    }
  }
  return ok(schedule);
}

/** Returns the max number of attempts for a given schedule. */
export function maxAttempts(schedule: RetrySchedule): number {
  return schedule.delaysHours.length;
}

/**
 * Computes the ISO timestamp for a specific attempt number.
 * @param schedule - the retry schedule to use
 * @param failedAt - ISO timestamp of the initial payment failure
 * @param attemptNumber - 0-based attempt index
 */
export function nextAttemptAt(
  schedule: RetrySchedule,
  failedAt: string,
  attemptNumber: number
): string | null {
  if (attemptNumber >= schedule.delaysHours.length) {
    return null;
  }
  const baseMs = new Date(failedAt).getTime();
  const delayMs = schedule.delaysHours[attemptNumber]! * 60 * 60 * 1000;
  return new Date(baseMs + delayMs).toISOString();
}

/**
 * Builds the full list of scheduled attempt timestamps from the initial failure time.
 * Returns an array where index 0 is the first attempt datetime.
 */
export function buildAttemptTimestamps(
  schedule: RetrySchedule,
  failedAt: string
): readonly string[] {
  return schedule.delaysHours.map((_, i) =>
    nextAttemptAt(schedule, failedAt, i) as string
  );
}
