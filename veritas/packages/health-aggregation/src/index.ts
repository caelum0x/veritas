// Re-exports the full public surface of @veritas/health-aggregation.
export type {
  HealthStatus,
  HealthCheckResult,
  HealthSnapshot,
  DependencyConfig,
  DependencyHealth,
  HealthHistoryEntry,
  DegradationPolicy,
} from "./types.js";

export type { HealthCheck, HealthCheckOptions } from "./health-check.js";
export { createHealthCheck } from "./health-check.js";
