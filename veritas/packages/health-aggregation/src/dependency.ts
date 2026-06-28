// Models and helpers for declaring, tracking, and querying dependency health states.
import type { DependencyConfig, DependencyHealth, HealthCheckResult, HealthStatus } from "./types.js";

/** Immutable store of declared dependencies and their latest check results. */
export interface DependencyStore {
  readonly entries: ReadonlyMap<string, DependencyHealth>;
}

/** Create an empty dependency store. */
export function createDependencyStore(): DependencyStore {
  return { entries: new Map() };
}

/** Register a new dependency declaration, returning a new store. */
export function registerDependency(
  store: DependencyStore,
  config: DependencyConfig
): DependencyStore {
  const next = new Map(store.entries);
  next.set(config.name, { config, result: null });
  return { entries: next };
}

/** Update the latest result for a dependency, returning a new store. */
export function updateDependencyResult(
  store: DependencyStore,
  name: string,
  result: HealthCheckResult
): DependencyStore {
  const existing = store.entries.get(name);
  if (!existing) return store;
  const next = new Map(store.entries);
  next.set(name, { ...existing, result });
  return { entries: next };
}

/** Derive effective health status for a set of dependencies using critical-first logic. */
export function deriveDependencyStatus(store: DependencyStore): HealthStatus {
  const all = [...store.entries.values()];
  if (all.length === 0) return "healthy";

  const critical = all.filter((d) => d.config.critical);
  const nonCritical = all.filter((d) => !d.config.critical);

  const criticalUnhealthy = critical.filter((d) => d.result?.status === "unhealthy");
  if (criticalUnhealthy.length > 0) return "unhealthy";

  const criticalDegraded = critical.filter((d) => d.result?.status === "degraded" || d.result === null);
  if (criticalDegraded.length > 0) return "degraded";

  const nonCriticalUnhealthy = nonCritical.filter((d) => d.result?.status === "unhealthy");
  if (nonCriticalUnhealthy.length > 0) return "degraded";

  return "healthy";
}

/** List all dependencies with their latest health results. */
export function listDependencies(store: DependencyStore): readonly DependencyHealth[] {
  return [...store.entries.values()];
}
