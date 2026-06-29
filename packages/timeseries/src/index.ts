// Public surface re-export for @veritas/timeseries.
export * from "./types.js";
export * from "./point.js";
export * from "./errors.js";
export * from "./aggregate.js";
export * from "./series.js";
export * from "./store.js";
export {
  downsample,
  downsampleToCount,
} from "./downsample.js";
export {
  type RollupResult,
  rollup,
  rollupAppend,
} from "./rollup.js";
export {
  type RetentionStore,
  createInMemoryRetentionStore,
  applyRetention,
  pruneAll,
} from "./retention.js";
export * from "./interpolate.js";
export * from "./query.js";
