// In-memory trial store with CRUD operations
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { UserId } from "@veritas/core";
import type { Trial, TrialId, TrialStatus } from "./types.js";
import { TrialNotFoundError } from "./errors.js";

export interface TrialStore {
  save(trial: Trial): Promise<Result<Trial, never>>;
  findById(id: TrialId): Promise<Result<Trial, TrialNotFoundError>>;
  findByUserId(userId: UserId): Promise<Result<readonly Trial[], never>>;
  findActiveByUserId(userId: UserId): Promise<Result<Trial | null, never>>;
  findByStatus(status: TrialStatus): Promise<Result<readonly Trial[], never>>;
  findExpiring(beforeIso: string): Promise<Result<readonly Trial[], never>>;
  delete(id: TrialId): Promise<Result<void, TrialNotFoundError>>;
}

export function createInMemoryTrialStore(): TrialStore {
  const store = new Map<TrialId, Trial>();

  return {
    async save(trial: Trial): Promise<Result<Trial, never>> {
      store.set(trial.id, trial);
      return ok(trial);
    },

    async findById(id: TrialId): Promise<Result<Trial, TrialNotFoundError>> {
      const trial = store.get(id);
      if (trial === undefined) {
        return err(new TrialNotFoundError(id));
      }
      return ok(trial);
    },

    async findByUserId(userId: UserId): Promise<Result<readonly Trial[], never>> {
      const trials = Array.from(store.values()).filter(
        (t) => t.userId === userId
      );
      return ok(trials);
    },

    async findActiveByUserId(
      userId: UserId
    ): Promise<Result<Trial | null, never>> {
      const trial =
        Array.from(store.values()).find(
          (t) => t.userId === userId && t.status === "active"
        ) ?? null;
      return ok(trial);
    },

    async findByStatus(
      status: TrialStatus
    ): Promise<Result<readonly Trial[], never>> {
      const trials = Array.from(store.values()).filter(
        (t) => t.status === status
      );
      return ok(trials);
    },

    async findExpiring(
      beforeIso: string
    ): Promise<Result<readonly Trial[], never>> {
      const cutoff = new Date(beforeIso).getTime();
      const trials = Array.from(store.values()).filter(
        (t) =>
          t.status === "active" &&
          new Date(t.expiresAt).getTime() <= cutoff
      );
      return ok(trials);
    },

    async delete(id: TrialId): Promise<Result<void, TrialNotFoundError>> {
      if (!store.has(id)) {
        return err(new TrialNotFoundError(id));
      }
      store.delete(id);
      return ok(undefined);
    },
  };
}
