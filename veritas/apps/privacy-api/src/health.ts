// Health check handler: runs all registered HealthCheck probes and returns aggregate status.

import type { Request, Response } from "express";
import { runHealthChecks } from "@veritas/observability";
import type { HealthCheck } from "@veritas/observability";

export function makeHealthHandler(checks: readonly HealthCheck[]) {
  return async (_req: Request, res: Response): Promise<void> => {
    const report = await runHealthChecks(checks);
    const httpStatus = report.status === "unhealthy" ? 503 : 200;
    res.status(httpStatus).json(report);
  };
}

export function makeLivenessHandler() {
  return (_req: Request, res: Response): void => {
    res.status(200).json({ status: "ok", service: "privacy-api" });
  };
}
