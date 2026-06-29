// Shared value types for health-aggregation: statuses, results, snapshots, and config.

/** Three-state health status for any component or dependency. */
export type HealthStatus = "healthy" | "degraded" | "unhealthy";

/** Result of a single health check execution. */
export interface HealthCheckResult {
  readonly name: string;
  readonly status: HealthStatus;
  readonly latencyMs: number;
  readonly checkedAt: string;
  readonly error?: string;
  readonly metadata: Record<string, unknown>;
}

/** Snapshot of overall system health across all registered checks. */
export interface HealthSnapshot {
  readonly status: HealthStatus;
  readonly checks: readonly HealthCheckResult[];
  readonly timestamp: string;
  readonly version?: string;
}

/** Configuration for a single dependency declaration. */
export interface DependencyConfig {
  readonly name: string;
  readonly critical: boolean;
  readonly timeout?: number;
  readonly tags?: readonly string[];
}

/** A named dependency with its latest health result. */
export interface DependencyHealth {
  readonly config: DependencyConfig;
  readonly result: HealthCheckResult | null;
}

/** Entry in the health history ring buffer. */
export interface HealthHistoryEntry {
  readonly snapshot: HealthSnapshot;
  readonly recordedAt: string;
}

/** Options for graceful degradation signal evaluation. */
export interface DegradationPolicy {
  /** Fraction of critical checks that must be healthy to stay fully healthy. */
  readonly criticalThreshold: number;
  /** Fraction of non-critical checks healthy to avoid degraded status. */
  readonly nonCriticalThreshold: number;
}

/** Registration metadata for a health check in the registry. */
export interface HealthCheckRegistration {
  readonly name: string;
  readonly critical: boolean;
  readonly tags: readonly string[];
  readonly registeredAt: string;
}

/** Degradation signal emitted when a component crosses a threshold. */
export interface DegradationSignal {
  readonly componentName: string;
  readonly previousStatus: HealthStatus;
  readonly currentStatus: HealthStatus;
  readonly triggeredAt: string;
  readonly reason: string;
}
