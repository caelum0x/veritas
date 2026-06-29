// Expiry reminder service — determines and records trial reminders to send
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Clock } from "@veritas/core";
import type { Trial, ReminderKind, SendReminderParams } from "./types.js";
import type { TrialStore } from "./store.js";
import {
  TrialNotFoundError,
  TrialNotActiveError,
  ReminderAlreadySentError,
} from "./errors.js";

export type ReminderError =
  | TrialNotFoundError
  | TrialNotActiveError
  | ReminderAlreadySentError;

export interface ReminderPort {
  send(trial: Trial, kind: ReminderKind): Promise<void>;
}

export function createNoopReminderPort(): ReminderPort {
  return {
    async send(_trial: Trial, _kind: ReminderKind): Promise<void> {
      // no-op mock implementation
    },
  };
}

export interface ReminderService {
  sendReminder(
    params: SendReminderParams
  ): Promise<Result<Trial, ReminderError>>;
  processExpiring(): Promise<Result<readonly Trial[], never>>;
}

const REMINDER_THRESHOLDS: Record<ReminderKind, number> = {
  "3day": 3 * 24 * 60 * 60 * 1000,
  "1day": 1 * 24 * 60 * 60 * 1000,
  expired: 0,
};

export function createReminderService(
  store: TrialStore,
  clock: Clock,
  port: ReminderPort
): ReminderService {
  return {
    async sendReminder(
      params: SendReminderParams
    ): Promise<Result<Trial, ReminderError>> {
      const { trialId, kind } = params;

      const found = await store.findById(trialId);
      if (!found.ok) {
        return err(found.error);
      }

      const trial = found.value;

      if (trial.status !== "active" && trial.status !== "extended") {
        return err(new TrialNotActiveError(trialId, trial.status));
      }

      if (trial.remindersSent.includes(kind)) {
        return err(new ReminderAlreadySentError(trialId, kind));
      }

      await port.send(trial, kind);

      const nowIso = clock.nowIso();
      const updated: Trial = {
        ...trial,
        remindersSent: [...trial.remindersSent, kind],
        updatedAt: nowIso,
      };

      const saved = await store.save(updated);
      if (!saved.ok) return err(saved.error as ReminderError);
      return ok(saved.value);
    },

    async processExpiring(): Promise<Result<readonly Trial[], never>> {
      const now = clock.now();
      const nowMs = new Date(now).getTime();

      const processed: Trial[] = [];

      for (const [kind, thresholdMs] of Object.entries(REMINDER_THRESHOLDS) as [
        ReminderKind,
        number
      ][]) {
        const cutoff = new Date(nowMs + thresholdMs).toISOString();
        const expiring = await store.findExpiring(cutoff);
        const expiringTrials = expiring.ok ? expiring.value : [];

        for (const trial of expiringTrials) {
          if (!trial.remindersSent.includes(kind)) {
            const result = await this.sendReminder({ trialId: trial.id, kind });
            if (result.ok) {
              processed.push(result.value);
            }
          }
        }
      }

      return ok(processed);
    },
  };
}
