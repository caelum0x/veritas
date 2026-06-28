// health.ts: health-check route handler using @veritas/observability health primitives.
import type { Request, Response } from "express";
import {
  runHealthChecks,
  AlwaysHealthyCheck,
  makeHealthCheck,
} from "@veritas/observability";
import type { HealthCheck } from "@veritas/observability";

/** Registers extra health checks (e.g. database ping) if needed. */
const coreChecks: HealthCheck[] = [
  new AlwaysHealthyCheck("api"),
  makeHealthCheck("memory", async () => {
    const used = process.memoryUsage().heapUsed;
    const limit = 1_024 * 1_024 * 1_024; // 1 GiB safety threshold
    return used < limit;
  }),
];

/** Express handler for GET /health and GET /v1/health. */
export async function healthHandler(_req: Request, res: Response): Promise<void> {
  const report = await runHealthChecks(coreChecks);
  const status = report.status === "unhealthy" ? 503 : report.status === "degraded" ? 207 : 200;
  res.status(status).json(report);
}

/** Express handler for GET /health/live — Kubernetes liveness probe. */
export function livenessHandler(_req: Request, res: Response): void {
  res.status(200).json({ status: "ok" });
}

/** Express handler for GET /health/ready — Kubernetes readiness probe. */
export async function readinessHandler(_req: Request, res: Response): Promise<void> {
  const report = await runHealthChecks(coreChecks);
  const status = report.status === "unhealthy" ? 503 : 200;
  res.status(status).json(report);
}
