// Public barrel: re-exports all modules of the @veritas/revenue package.

// CacResult/RecognitionSchedule are owned by cac.js/recognition.js; types.js
// contributes the remaining shared revenue primitives.
export {
  RevenueAmount,
  RevenueMovement,
  RevenueEvent,
  MovementSummary,
  CacInputs,
  RecognitionEntry,
  RevenueMetrics,
} from "./types.js";
export * from "./errors.js";
export * from "./mrr.js";
export * from "./arr.js";
export * from "./cohort.js";
export * from "./expansion.js";
export * from "./recognition.js";
export * from "./forecast.js";
export * from "./ltv.js";
export * from "./cac.js";
export * from "./report.js";
export * from "./store.js";
