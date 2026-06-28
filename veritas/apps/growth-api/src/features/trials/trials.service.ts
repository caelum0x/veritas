// Trial feature service: manages trial lifecycle using @veritas/trials domain types.
import { epochToIso, type UserId } from "@veritas/core";
import {
  newTrialId,
  TrialAlreadyActiveError,
  TrialNotFoundError,
  TrialNotActiveError,
  TrialExtensionLimitError,
} from "@veritas/trials";
import type { Trial, TrialId, TrialStatus } from "@veritas/trials";
import type { CreateTrialBody, ExtendTrialBody, ConvertTrialBody } from "./trials.schema.js";

const MAX_EXTENSIONS = 3;

export type TrialServiceError =
  | TrialNotFoundError
  | TrialAlreadyActiveError
  | TrialNotActiveError
  | TrialExtensionLimitError;

export type TrialResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: TrialServiceError };

/** In-process trial store — swap for a real persistence-backed store in production. */
const store = new Map<TrialId, Trial>();

function findById(id: TrialId): Trial | undefined {
  return store.get(id);
}

function findActiveByUserId(userId: UserId): Trial | null {
  for (const t of store.values()) {
    if (t.userId === userId && (t.status === "active" || t.status === "extended")) return t;
  }
  return null;
}

function persist(trial: Trial): Trial {
  store.set(trial.id, trial);
  return trial;
}

export class TrialsService {
  create(body: CreateTrialBody): TrialResult<Trial> {
    const userId = body.userId as UserId;
    const existing = findActiveByUserId(userId);
    if (existing !== null) {
      return { ok: false, error: new TrialAlreadyActiveError(userId) };
    }

    const nowMs = Date.now();
    const expiresMs = nowMs + body.durationDays * 86_400_000;
    const trial: Trial = {
      id: newTrialId(),
      userId,
      planId: body.planId,
      status: "active" as TrialStatus,
      startsAt: epochToIso(nowMs),
      expiresAt: epochToIso(expiresMs),
      extendedAt: null,
      convertedAt: null,
      cancelledAt: null,
      extensionCount: 0,
      remindersSent: [],
      metadata: body.metadata ?? {},
      createdAt: epochToIso(nowMs),
      updatedAt: epochToIso(nowMs),
    };
    return { ok: true, value: persist(trial) };
  }

  getById(id: string): TrialResult<Trial> {
    const trial = findById(id as TrialId);
    if (trial === undefined) {
      return { ok: false, error: new TrialNotFoundError(id as TrialId) };
    }
    return { ok: true, value: trial };
  }

  getActiveForUser(userId: string): Trial | null {
    return findActiveByUserId(userId as UserId);
  }

  extend(id: string, body: ExtendTrialBody): TrialResult<Trial> {
    const trial = findById(id as TrialId);
    if (trial === undefined) {
      return { ok: false, error: new TrialNotFoundError(id as TrialId) };
    }
    if (trial.status !== "active" && trial.status !== "extended") {
      return { ok: false, error: new TrialNotActiveError(trial.id, trial.status) };
    }
    if (trial.extensionCount >= MAX_EXTENSIONS) {
      return { ok: false, error: new TrialExtensionLimitError(trial.id, MAX_EXTENSIONS) };
    }

    const nowMs = Date.now();
    const currentExpiresMs = new Date(trial.expiresAt).getTime();
    const updated: Trial = {
      ...trial,
      status: "extended" as TrialStatus,
      expiresAt: epochToIso(currentExpiresMs + body.daysToAdd * 86_400_000),
      extendedAt: epochToIso(nowMs),
      extensionCount: trial.extensionCount + 1,
      updatedAt: epochToIso(nowMs),
    };
    return { ok: true, value: persist(updated) };
  }

  convert(id: string, body: ConvertTrialBody): TrialResult<Trial> {
    const trial = findById(id as TrialId);
    if (trial === undefined) {
      return { ok: false, error: new TrialNotFoundError(id as TrialId) };
    }
    if (trial.status !== "active" && trial.status !== "extended") {
      return { ok: false, error: new TrialNotActiveError(trial.id, trial.status) };
    }

    const nowMs = Date.now();
    const updated: Trial = {
      ...trial,
      status: "converted" as TrialStatus,
      planId: body.planId,
      convertedAt: epochToIso(nowMs),
      updatedAt: epochToIso(nowMs),
    };
    return { ok: true, value: persist(updated) };
  }

  checkEligibility(userId: string): { eligible: boolean; reason: string | null } {
    const active = findActiveByUserId(userId as UserId);
    if (active !== null) {
      return { eligible: false, reason: "ALREADY_ACTIVE" };
    }
    return { eligible: true, reason: null };
  }
}
