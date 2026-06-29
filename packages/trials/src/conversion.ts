// Trial-to-paid conversion logic — marks a trial as converted.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Clock } from "@veritas/core";
import type { Trial, ConvertTrialParams, TrialId } from "./types.js";
import { TrialNotFoundError, TrialNotActiveError } from "./errors.js";
import type { TrialStore } from "./store.js";

/** Outcome of a successful conversion. */
export interface ConversionOutcome {
  readonly trial: Trial;
  readonly previousPlanId: string;
  readonly newPlanId: string;
  readonly convertedAt: string;
}

/** Convert an active trial to a paid subscription. */
export async function convertTrial(
  params: ConvertTrialParams,
  store: TrialStore,
  clock: Clock
): Promise<Result<ConversionOutcome, TrialNotFoundError | TrialNotActiveError>> {
  const findResult = await store.findById(params.trialId);
  if (!findResult.ok) return findResult;

  const trial = findResult.value;
  if (trial.status !== "active" && trial.status !== "extended") {
    return err(new TrialNotActiveError(params.trialId, trial.status));
  }

  const nowIso = clock.nowIso();
  const converted: Trial = {
    ...trial,
    status: "converted",
    planId: params.planId,
    convertedAt: nowIso,
    updatedAt: nowIso,
  };

  const saveResult = await store.save(converted);
  if (!saveResult.ok) return saveResult;

  return ok({
    trial: saveResult.value,
    previousPlanId: trial.planId,
    newPlanId: params.planId,
    convertedAt: nowIso,
  });
}

/** Check whether a specific trial has been converted. */
export async function isConverted(
  trialId: TrialId,
  store: TrialStore
): Promise<Result<boolean, TrialNotFoundError>> {
  const result = await store.findById(trialId);
  if (!result.ok) return result;
  return ok(result.value.status === "converted");
}
