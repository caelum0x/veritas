// Trial extension logic — adds days to an active trial's expiry
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Clock } from "@veritas/core";
import type { Trial, ExtendTrialParams } from "./types.js";
import type { TrialStore } from "./store.js";
import {
  TrialNotFoundError,
  TrialNotActiveError,
  TrialExtensionLimitError,
  InvalidExtensionDaysError,
} from "./errors.js";

export const MAX_EXTENSIONS = 3;
export const MAX_EXTENSION_DAYS = 90;
export const MIN_EXTENSION_DAYS = 1;

export type ExtensionError =
  | TrialNotFoundError
  | TrialNotActiveError
  | TrialExtensionLimitError
  | InvalidExtensionDaysError;

export interface ExtensionService {
  extend(params: ExtendTrialParams): Promise<Result<Trial, ExtensionError>>;
}

export function createExtensionService(
  store: TrialStore,
  clock: Clock
): ExtensionService {
  return {
    async extend(
      params: ExtendTrialParams
    ): Promise<Result<Trial, ExtensionError>> {
      const { trialId, daysToAdd, reason: _reason } = params;

      if (daysToAdd < MIN_EXTENSION_DAYS || daysToAdd > MAX_EXTENSION_DAYS) {
        return err(new InvalidExtensionDaysError(daysToAdd));
      }

      const found = await store.findById(trialId);
      if (!found.ok) {
        return err(found.error);
      }

      const trial = found.value;

      if (trial.status !== "active") {
        return err(new TrialNotActiveError(trialId, trial.status));
      }

      if (trial.extensionCount >= MAX_EXTENSIONS) {
        return err(new TrialExtensionLimitError(trialId, MAX_EXTENSIONS));
      }

      const nowIso = clock.nowIso();
      const currentExpiry = new Date(trial.expiresAt).getTime();
      const newExpiry = new Date(
        currentExpiry + daysToAdd * 24 * 60 * 60 * 1000
      ).toISOString() as typeof trial.expiresAt;

      const updated: Trial = {
        ...trial,
        expiresAt: newExpiry,
        extendedAt: nowIso,
        extensionCount: trial.extensionCount + 1,
        status: "extended",
        updatedAt: nowIso,
      };

      const saved = await store.save(updated);
      if (!saved.ok) return err(saved.error as ExtensionError);
      return ok(saved.value);
    },
  };
}
