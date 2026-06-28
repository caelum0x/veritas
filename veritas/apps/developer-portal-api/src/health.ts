// Health check endpoint handler using @veritas/observability runHealthChecks.
import type { Request, Response } from "express";
import { runHealthChecks, AlwaysHealthyCheck, type HealthCheck } from "@veritas/observability";
import type { Deps } from "./container.js";

export function buildHealthChecks(deps: Deps): readonly HealthCheck[] {
  return [
    new AlwaysHealthyCheck("api"),
    new AlwaysHealthyCheck("portal-store"),
    new AlwaysHealthyCheck("partner-store"),
    new AlwaysHealthyCheck("analytics-store"),
  ];
}

export function createHealthHandler(deps: Deps) {
  const checks = buildHealthChecks(deps);

  return async function healthHandler(req: Request, res: Response): Promise<void> {
    const report = await runHealthChecks(checks);
    const statusCode = report.status === "unhealthy" ? 503 : 200;
    res.status(statusCode).json(report);
  };
}

export function createLivenessHandler() {
  return function livenessHandler(_req: Request, res: Response): void {
    res.status(200).json({ status: "ok", service: "developer-portal-api" });
  };
}
