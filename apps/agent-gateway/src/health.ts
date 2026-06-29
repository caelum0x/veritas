// Health check route handler — runs all registered probes and returns aggregate status.

import type { Request, Response } from "express";
import { runHealthChecks, type HealthCheck } from "@veritas/observability";

/** Build a health route handler from the registered checks. */
export function healthHandler(checks: readonly HealthCheck[]) {
  return async (_req: Request, res: Response): Promise<void> => {
    const report = await runHealthChecks(checks);
    const httpStatus = report.status === "unhealthy" ? 503 : 200;
    res.status(httpStatus).json(report);
  };
}

/** Liveness probe — always returns 200 if the process is running. */
export function livenessHandler(_req: Request, res: Response): void {
  res.status(200).json({ status: "alive", service: "agent-gateway" });
}

/** Readiness probe — returns 200 only when the service is ready to handle traffic. */
export function readinessHandler(checks: readonly HealthCheck[]) {
  return async (_req: Request, res: Response): Promise<void> => {
    const report = await runHealthChecks(checks);
    const httpStatus = report.status === "unhealthy" ? 503 : 200;
    res.status(httpStatus).json({ status: report.status, service: "agent-gateway" });
  };
}
