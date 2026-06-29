// Health endpoint handler using @veritas/observability health aggregation.
import type { Request, Response } from "express";
import {
  runHealthChecks,
  type HealthCheck,
  type AggregateHealthReport,
} from "@veritas/observability";

/** Runs all health checks and sends the aggregate report as JSON. */
export async function handleHealthRequest(
  checks: readonly HealthCheck[],
  req: Request,
  res: Response,
): Promise<void> {
  const report: AggregateHealthReport = await runHealthChecks(checks);
  const status = report.status === "unhealthy" ? 503 : 200;
  res.status(status).json(report);
}

/** Returns a lightweight liveness probe (always 200 if process is alive). */
export function handleLiveness(_req: Request, res: Response): void {
  res.status(200).json({ status: "alive", service: "@veritas/ops-api" });
}
