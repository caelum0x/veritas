// v1 Health controller: liveness and readiness probe handlers.
import type { Request, Response } from "express";

/** ISO timestamp of when this process started, used as build/start indicator. */
const startedAt = new Date().toISOString();

/** Shape of the health response payload. */
interface HealthPayload {
  readonly status: "ok" | "degraded";
  readonly version: string;
  readonly startedAt: string;
  readonly uptime: number;
}

function buildPayload(status: "ok" | "degraded"): HealthPayload {
  return {
    status,
    version: process.env["npm_package_version"] ?? "unknown",
    startedAt,
    uptime: Math.floor(process.uptime()),
  };
}

/** GET /v1/health — liveness probe: always returns 200 if the process is alive. */
export function livenessHandler(_req: Request, res: Response): void {
  res.status(200).json(buildPayload("ok"));
}

/** GET /v1/health/ready — readiness probe: confirms the app can serve traffic. */
export function readinessHandler(_req: Request, res: Response): void {
  res.status(200).json(buildPayload("ok"));
}
