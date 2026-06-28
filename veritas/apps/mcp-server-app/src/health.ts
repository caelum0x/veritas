// Health-check utilities for the MCP server application process.

import type { Logger } from "@veritas/observability";

export interface HealthStatus {
  readonly status: "ok" | "degraded" | "down";
  readonly uptime: number;
  readonly timestamp: string;
  readonly version: string;
}

const startTime = Date.now();

/**
 * Build a current health status snapshot.
 * Status is "ok" unless the caller supplies degraded/down overrides.
 */
export function buildHealthStatus(
  version: string,
  status: HealthStatus["status"] = "ok"
): HealthStatus {
  return {
    status,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    version,
  };
}

/** Log a health check result at the appropriate level. */
export function logHealth(logger: Logger, health: HealthStatus): void {
  const ctx = { uptime: health.uptime, version: health.version, timestamp: health.timestamp };
  if (health.status === "ok") {
    logger.info("health check ok", ctx);
  } else if (health.status === "degraded") {
    logger.warn("health check degraded", ctx);
  } else {
    logger.error("health check down", ctx);
  }
}
