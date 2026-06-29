// Computes and formats overall system status from a HealthSnapshot for API/UI consumption.
import type { HealthSnapshot, HealthStatus } from "./types.js";

/** HTTP status codes mapped from health status. */
const STATUS_CODES: Record<HealthStatus, number> = {
  healthy: 200,
  degraded: 200,
  unhealthy: 503,
};

/** A structured status response suitable for health endpoints. */
export interface StatusResponse {
  readonly status: HealthStatus;
  readonly httpCode: number;
  readonly summary: string;
  readonly timestamp: string;
  readonly version?: string;
  readonly checks: readonly StatusCheckSummary[];
}

export interface StatusCheckSummary {
  readonly name: string;
  readonly status: HealthStatus;
  readonly latencyMs: number;
  readonly error?: string;
}

/** Convert a HealthSnapshot into a StatusResponse for external consumers. */
export function toStatusResponse(snapshot: HealthSnapshot): StatusResponse {
  return {
    status: snapshot.status,
    httpCode: STATUS_CODES[snapshot.status],
    summary: buildSummary(snapshot),
    timestamp: snapshot.timestamp,
    version: snapshot.version,
    checks: snapshot.checks.map((c) => ({
      name: c.name,
      status: c.status,
      latencyMs: c.latencyMs,
      ...(c.error !== undefined ? { error: c.error } : {}),
    })),
  };
}

/** Build a human-readable summary sentence from a snapshot. */
function buildSummary(snapshot: HealthSnapshot): string {
  const total = snapshot.checks.length;
  const unhealthy = snapshot.checks.filter((c) => c.status === "unhealthy").length;
  const degraded = snapshot.checks.filter((c) => c.status === "degraded").length;

  if (snapshot.status === "healthy") return `All ${total} checks passed`;
  if (snapshot.status === "degraded")
    return `${degraded} of ${total} checks degraded, ${unhealthy} unhealthy`;
  return `${unhealthy} of ${total} checks unhealthy`;
}

/** Determine if the system should be considered operationally available. */
export function isOperational(snapshot: HealthSnapshot): boolean {
  return snapshot.status !== "unhealthy";
}
