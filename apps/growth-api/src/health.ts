// Liveness and readiness health check handlers using @veritas/observability.
import type { Request, Response } from "express";
import {
  AlwaysHealthyCheck,
  runHealthChecks,
  type AggregateHealthReport,
  type HealthCheck,
} from "@veritas/observability";

const startedAt = new Date().toISOString();

/** Registered health checks — extend via addHealthCheck() at boot. */
const checks: HealthCheck[] = [new AlwaysHealthyCheck("self")];

export function addHealthCheck(check: HealthCheck): void {
  checks.push(check);
}

/** GET /health/live — process is alive. */
export function livenessHandler(_req: Request, res: Response): void {
  res.status(200).json({ status: "ok", startedAt });
}

/** GET /health/ready — all components healthy. */
export async function readinessHandler(_req: Request, res: Response): Promise<void> {
  const report: AggregateHealthReport = await runHealthChecks(checks);
  const httpStatus = report.status === "unhealthy" ? 503 : 200;
  res.status(httpStatus).json(report);
}
