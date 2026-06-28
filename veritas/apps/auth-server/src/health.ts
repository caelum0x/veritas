// Health check endpoint handler using @veritas/observability aggregated checks.

import type { Request, Response } from "express";
import { runHealthChecks, type HealthCheck } from "@veritas/observability";

const STATUS_HTTP: Record<string, number> = {
  healthy: 200,
  degraded: 200,
  unhealthy: 503,
};

/** Express handler for GET /health — runs all registered health checks and returns an aggregate report. */
export function createHealthHandler(checks: readonly HealthCheck[]) {
  return async (_req: Request, res: Response): Promise<void> => {
    const report = await runHealthChecks(checks);
    const httpStatus = STATUS_HTTP[report.status] ?? 503;
    res.status(httpStatus).json(report);
  };
}
