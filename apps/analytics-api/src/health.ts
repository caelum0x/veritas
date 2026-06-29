// Health check endpoint handler — aggregates component checks and returns a report.
import type { Request, Response } from "express";
import { runHealthChecks } from "@veritas/observability";
import type { HealthCheck } from "@veritas/observability";

/** Express route handler for GET /health — runs all registered health checks. */
export function makeHealthHandler(checks: readonly HealthCheck[]) {
  return async function healthHandler(_req: Request, res: Response): Promise<void> {
    const report = await runHealthChecks(checks);
    const status = report.status === "unhealthy" ? 503 : 200;
    res.status(status).json({
      success: report.status !== "unhealthy",
      data: report,
    });
  };
}
