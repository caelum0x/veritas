// Calibration data store: in-memory store for CalibrationSamples and CalibrationParams
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { CalibrationSample, CalibrationParams } from "./calibrator.js";

export interface StoredCalibration {
  readonly id: string;
  readonly name: string;
  readonly params: CalibrationParams;
  readonly samples: readonly CalibrationSample[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CalibrationStore {
  save(id: string, name: string, params: CalibrationParams, samples: readonly CalibrationSample[]): Result<StoredCalibration>;
  load(id: string): Result<StoredCalibration>;
  list(): Result<readonly StoredCalibration[]>;
  remove(id: string): Result<void>;
  appendSamples(id: string, samples: readonly CalibrationSample[]): Result<StoredCalibration>;
}

/** Create an in-memory CalibrationStore. Suitable for tests and single-process deployments. */
export function createInMemoryCalibrationStore(): CalibrationStore {
  const store = new Map<string, StoredCalibration>();

  function now(): string {
    return new Date().toISOString();
  }

  return {
    save(id, name, params, samples) {
      const ts = now();
      const record: StoredCalibration = {
        id,
        name,
        params,
        samples,
        createdAt: store.has(id) ? (store.get(id)!.createdAt) : ts,
        updatedAt: ts,
      };
      store.set(id, record);
      return ok(record);
    },

    load(id) {
      const record = store.get(id);
      if (!record) {
        return err(new Error(`CalibrationStore: no entry found for id "${id}"`));
      }
      return ok(record);
    },

    list() {
      return ok([...store.values()]);
    },

    remove(id) {
      if (!store.has(id)) {
        return err(new Error(`CalibrationStore: cannot remove unknown id "${id}"`));
      }
      store.delete(id);
      return ok(undefined);
    },

    appendSamples(id, newSamples) {
      const existing = store.get(id);
      if (!existing) {
        return err(new Error(`CalibrationStore: cannot append to unknown id "${id}"`));
      }
      const updated: StoredCalibration = {
        ...existing,
        samples: [...existing.samples, ...newSamples],
        updatedAt: now(),
      };
      store.set(id, updated);
      return ok(updated);
    },
  };
}
