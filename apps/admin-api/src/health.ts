// Health endpoint handler exposing liveness and readiness probes.
import type { Request, Response } from "express";
import type { Deps } from "./container.js";

/** GET /health — liveness probe, always returns 200 if the process is up. */
export function livenessHandler(_req: Request, res: Response): void {
  res.status(200).json({ status: "ok", service: "admin-api" });
}

/** GET /health/ready — readiness probe, runs all registered health checks. */
export function buildReadinessHandler(deps: Deps) {
  return async (_req: Request, res: Response): Promise<void> => {
    const report = await deps.runHealth();
    const status = report.status === "healthy" ? 200 : report.status === "degraded" ? 200 : 503;
    res.status(status).json(report);
  };
}
