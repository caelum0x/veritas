// In-memory store for dunning records, attempts, reminders, and recovery data.

import { ok, err, type Result } from "@veritas/core";
import type { DunningProcess } from "./dunning.js";
import type { DunningAttempt, DunningReminder, DunningListParams, AttemptId, ReminderId, DunningId } from "./types.js";
import type { RecoveryRecord, RecoveryId } from "./recovery.js";
import {
  DunningNotFoundError,
  AttemptNotFoundError,
  ReminderNotFoundError,
  RecoveryNotFoundError,
} from "./errors.js";

/** Port interface for dunning persistence. */
export interface DunningStore {
  // Dunning processes
  saveDunning(dunning: DunningProcess): Promise<Result<DunningProcess>>;
  getDunning(id: DunningId): Promise<Result<DunningProcess>>;
  findDunningBySubscription(subscriptionId: string): Promise<Result<DunningProcess | undefined>>;
  listDunning(params: DunningListParams): Promise<Result<readonly DunningProcess[]>>;
  deleteDunning(id: DunningId): Promise<Result<void>>;

  // Payment attempts
  saveAttempt(attempt: DunningAttempt): Promise<Result<DunningAttempt>>;
  getAttempt(id: AttemptId): Promise<Result<DunningAttempt>>;
  listAttemptsByDunning(dunningId: DunningId): Promise<Result<readonly DunningAttempt[]>>;

  // Reminders
  saveReminder(reminder: DunningReminder): Promise<Result<DunningReminder>>;
  getReminder(id: ReminderId): Promise<Result<DunningReminder>>;
  listRemindersByDunning(dunningId: DunningId): Promise<Result<readonly DunningReminder[]>>;

  // Recovery records
  saveRecovery(recovery: RecoveryRecord): Promise<Result<RecoveryRecord>>;
  getRecovery(id: RecoveryId): Promise<Result<RecoveryRecord>>;
  findRecoveryByDunning(dunningId: DunningId): Promise<Result<RecoveryRecord | undefined>>;
  listRecoveriesByOrg(organizationId: string): Promise<Result<readonly RecoveryRecord[]>>;
}

/** Creates a new in-memory DunningStore instance for development and testing. */
export function createInMemoryDunningStore(): DunningStore {
  const dunnings = new Map<string, DunningProcess>();
  const attempts = new Map<string, DunningAttempt>();
  const reminders = new Map<string, DunningReminder>();
  const recoveries = new Map<string, RecoveryRecord>();

  return {
    async saveDunning(dunning) {
      dunnings.set(dunning.id, dunning);
      return ok(dunning);
    },

    async getDunning(id) {
      const d = dunnings.get(id);
      if (!d) return err(new DunningNotFoundError(id));
      return ok(d);
    },

    async findDunningBySubscription(subscriptionId) {
      const found = [...dunnings.values()].find((d) => d.subscriptionId === subscriptionId);
      return ok(found);
    },

    async listDunning(params) {
      let results = [...dunnings.values()];
      if (params.subscriptionId !== undefined) {
        results = results.filter((d) => d.subscriptionId === params.subscriptionId);
      }
      if (params.organizationId !== undefined) {
        results = results.filter((d) => d.organizationId === params.organizationId);
      }
      if (params.status !== undefined) {
        results = results.filter((d) => d.status === params.status);
      }
      if (params.cursor !== undefined) {
        const idx = results.findIndex((d) => d.id === params.cursor);
        if (idx !== -1) results = results.slice(idx + 1);
      }
      const limit = params.limit ?? 20;
      return ok(results.slice(0, limit));
    },

    async deleteDunning(id) {
      if (!dunnings.has(id)) return err(new DunningNotFoundError(id));
      dunnings.delete(id);
      return ok(undefined);
    },

    async saveAttempt(attempt) {
      attempts.set(attempt.id, attempt);
      return ok(attempt);
    },

    async getAttempt(id) {
      const a = attempts.get(id);
      if (!a) return err(new AttemptNotFoundError(id));
      return ok(a);
    },

    async listAttemptsByDunning(dunningId) {
      const results = [...attempts.values()]
        .filter((a) => a.dunningId === dunningId)
        .sort((a, b) => a.attemptNumber - b.attemptNumber);
      return ok(results);
    },

    async saveReminder(reminder) {
      reminders.set(reminder.id, reminder);
      return ok(reminder);
    },

    async getReminder(id) {
      const r = reminders.get(id);
      if (!r) return err(new ReminderNotFoundError(id));
      return ok(r);
    },

    async listRemindersByDunning(dunningId) {
      const results = [...reminders.values()]
        .filter((r) => r.dunningId === dunningId)
        .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
      return ok(results);
    },

    async saveRecovery(recovery) {
      recoveries.set(recovery.id, recovery);
      return ok(recovery);
    },

    async getRecovery(id) {
      const r = recoveries.get(id);
      if (!r) return err(new RecoveryNotFoundError(id));
      return ok(r);
    },

    async findRecoveryByDunning(dunningId) {
      const found = [...recoveries.values()].find((r) => r.dunningId === dunningId);
      return ok(found);
    },

    async listRecoveriesByOrg(organizationId) {
      const results = [...recoveries.values()].filter((r) => r.organizationId === organizationId);
      return ok(results);
    },
  };
}
