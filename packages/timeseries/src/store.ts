// In-memory timeseries store: port interface + in-memory implementation.
import { ok, err, type Result } from "@veritas/core";
import { type DataPoint, makePoint } from "./point.js";
import { type TimeSeries, type TimeSeriesMeta, makeSeries, appendPoints } from "./series.js";
import {
  TimeseriesNotFoundError,
  DuplicateSeriesError,
} from "./errors.js";

export interface TimeseriesStore {
  create(meta: TimeSeriesMeta): Result<TimeSeries, DuplicateSeriesError>;
  get(seriesId: string): Result<TimeSeries, TimeseriesNotFoundError>;
  list(): readonly TimeSeries[];
  delete(seriesId: string): Result<void, TimeseriesNotFoundError>;
  append(
    seriesId: string,
    points: readonly DataPoint[],
    nowMs: number
  ): Result<TimeSeries, TimeseriesNotFoundError>;
  replace(
    seriesId: string,
    points: readonly DataPoint[],
    nowMs: number
  ): Result<TimeSeries, TimeseriesNotFoundError>;
}

export function createInMemoryTimeseriesStore(): TimeseriesStore {
  const store = new Map<string, TimeSeries>();

  return {
    create(meta) {
      if (store.has(meta.id)) {
        return err(new DuplicateSeriesError(meta.id));
      }
      const series = makeSeries(meta, []);
      store.set(meta.id, series);
      return ok(series);
    },

    get(seriesId) {
      const series = store.get(seriesId);
      if (!series) return err(new TimeseriesNotFoundError(seriesId));
      return ok(series);
    },

    list() {
      return [...store.values()];
    },

    delete(seriesId) {
      if (!store.has(seriesId)) {
        return err(new TimeseriesNotFoundError(seriesId));
      }
      store.delete(seriesId);
      return ok(undefined);
    },

    append(seriesId, points, nowMs) {
      const existing = store.get(seriesId);
      if (!existing) return err(new TimeseriesNotFoundError(seriesId));
      const updated = appendPoints(existing, points, nowMs);
      store.set(seriesId, updated);
      return ok(updated);
    },

    replace(seriesId, points, nowMs) {
      const existing = store.get(seriesId);
      if (!existing) return err(new TimeseriesNotFoundError(seriesId));
      const updatedMeta: TimeSeriesMeta = Object.freeze({
        ...existing.meta,
        updatedAt: nowMs,
      });
      const replaced = makeSeries(updatedMeta, points);
      store.set(seriesId, replaced);
      return ok(replaced);
    },
  };
}

// Convenience: create a DataPoint from raw values.
export { makePoint };
