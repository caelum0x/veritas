// Purpose registry: maintains the catalog of declared processing purposes.
import { Result, ok, err } from "@veritas/core";
import { type Purpose } from "./purpose.js";
import { PurposeNotFoundError, PurposeAlreadyExistsError } from "./errors.js";

export interface PurposeRegistry {
  register(purpose: Purpose): Result<Purpose, PurposeAlreadyExistsError>;
  get(purposeId: string): Result<Purpose, PurposeNotFoundError>;
  list(): ReadonlyArray<Purpose>;
  has(purposeId: string): boolean;
  deactivate(purposeId: string): Result<Purpose, PurposeNotFoundError>;
}

export function createInMemoryPurposeRegistry(
  initial: ReadonlyArray<Purpose> = []
): PurposeRegistry {
  const store = new Map<string, Purpose>(initial.map((p) => [p.id, p]));

  return {
    register(purpose: Purpose): Result<Purpose, PurposeAlreadyExistsError> {
      if (store.has(purpose.id)) {
        return err(new PurposeAlreadyExistsError(purpose.id));
      }
      store.set(purpose.id, purpose);
      return ok(purpose);
    },

    get(purposeId: string): Result<Purpose, PurposeNotFoundError> {
      const purpose = store.get(purposeId);
      if (purpose === undefined) {
        return err(new PurposeNotFoundError(purposeId));
      }
      return ok(purpose);
    },

    list(): ReadonlyArray<Purpose> {
      return Array.from(store.values());
    },

    has(purposeId: string): boolean {
      return store.has(purposeId);
    },

    deactivate(purposeId: string): Result<Purpose, PurposeNotFoundError> {
      const purpose = store.get(purposeId);
      if (purpose === undefined) {
        return err(new PurposeNotFoundError(purposeId));
      }
      const deactivated: Purpose = { ...purpose, active: false };
      store.set(purposeId, deactivated);
      return ok(deactivated);
    },
  };
}
