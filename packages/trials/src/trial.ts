// Core trial creation and lifecycle management for @veritas/trials.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import { epochToIso } from "@veritas/core";
import type { Clock } from "@veritas/core";
import type {
  Trial,
  TrialId,
  TrialStatus,
  CreateTrialParams,
} from "./types.js";
import { newTrialId } from "./types.js";
import { TrialAlreadyActiveError, TrialNotActiveError, TrialNotFoundError } from "./errors.js";
import type { TrialStore } from "./store.js";

/** Create a new trial for a user after verifying no active trial exists. */
export async function createTrial(
  params: CreateTrialParams,
  store: TrialStore,
  clock: Clock
): Promise<Result<Trial, TrialAlreadyActiveError>> {
  const existingResult = await store.findActiveByUserId(params.userId);
  if (existingResult.ok) {
    const existing = existingResult.value;
    if (existing !== null) {
      return err(new TrialAlreadyActiveError(params.userId));
    }
  }

  const nowMs = clock.now();
  const expiresMs = nowMs + params.durationDays * 86_400_000;
  const nowIso = epochToIso(nowMs);
  const expiresIso = epochToIso(expiresMs);

  const trial: Trial = {
    id: newTrialId(),
    userId: params.userId,
    planId: params.planId,
    status: "active",
    startsAt: nowIso,
    expiresAt: expiresIso,
    extendedAt: null,
    convertedAt: null,
    cancelledAt: null,
    extensionCount: 0,
    remindersSent: [],
    metadata: params.metadata ?? {},
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const saved = await store.save(trial);
  return saved;
}

/** Cancel an active trial, marking it as cancelled. */
export async function cancelTrial(
  trialId: TrialId,
  store: TrialStore,
  clock: Clock
): Promise<Result<Trial, TrialNotFoundError | TrialNotActiveError>> {
  const findResult = await store.findById(trialId);
  if (!findResult.ok) return findResult;

  const trial = findResult.value;
  if (trial.status !== "active" && trial.status !== "extended") {
    return err(new TrialNotActiveError(trialId, trial.status));
  }

  const nowIso = clock.nowIso();
  const updated: Trial = {
    ...trial,
    status: "cancelled" as TrialStatus,
    cancelledAt: nowIso,
    updatedAt: nowIso,
  };

  return store.save(updated);
}

/** Retrieve a trial by its id. */
export async function getTrialById(
  trialId: TrialId,
  store: TrialStore
): Promise<Result<Trial, TrialNotFoundError>> {
  return store.findById(trialId);
}
