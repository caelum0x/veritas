// Trial expiry detection and enforcement — marks overdue active trials as expired.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Clock } from "@veritas/core";
import type { Trial, TrialId } from "./types.js";
import { TrialNotFoundError, TrialNotActiveError } from "./errors.js";
import type { TrialStore } from "./store.js";

/** Summary produced when a single trial is expired. */
export interface ExpiryOutcome {
  readonly trialId: TrialId;
  readonly userId: string;
  readonly expiredAt: string;
}

/** Expire a single trial by id if it is currently active and past its expiry date. */
export async function expireTrial(
  trialId: TrialId,
  store: TrialStore,
  clock: Clock
): Promise<Result<ExpiryOutcome, TrialNotFoundError | TrialNotActiveError>> {
  const findResult = await store.findById(trialId);
  if (!findResult.ok) return findResult;

  const trial = findResult.value;
  if (trial.status !== "active" && trial.status !== "extended") {
    return err(new TrialNotActiveError(trialId, trial.status));
  }

  const nowIso = clock.nowIso();
  const expired: Trial = {
    ...trial,
    status: "expired",
    updatedAt: nowIso,
  };

  const saveResult = await store.save(expired);
  if (!saveResult.ok) return saveResult;

  return ok({
    trialId,
    userId: trial.userId,
    expiredAt: nowIso,
  });
}

/** Batch-expire all active trials whose expiry date is on or before `clock.now()`. */
export async function expireOverdueTrials(
  store: TrialStore,
  clock: Clock
): Promise<Result<readonly ExpiryOutcome[], never>> {
  const nowIso = clock.nowIso();
  const overdueResult = await store.findExpiring(nowIso);
  if (!overdueResult.ok) return overdueResult;

  const outcomes: ExpiryOutcome[] = [];
  for (const trial of overdueResult.value) {
    const result = await expireTrial(trial.id, store, clock);
    if (result.ok) {
      outcomes.push(result.value);
    }
  }

  return ok(outcomes);
}

/** Return true if a trial is past its expiry timestamp according to the clock. */
export function isTrialOverdue(trial: Trial, clock: Clock): boolean {
  return clock.now() >= new Date(trial.expiresAt).getTime();
}

/** Compute milliseconds remaining on an active trial (0 if already past expiry). */
export function millisRemaining(trial: Trial, clock: Clock): number {
  const diff = new Date(trial.expiresAt).getTime() - clock.now();
  return diff < 0 ? 0 : diff;
}
