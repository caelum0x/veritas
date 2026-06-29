// Health check endpoint handler using @veritas/observability runHealthChecks.

import type { Request, Response } from "express";
import { runHealthChecks } from "@veritas/observability";
import type { Deps } from "./container.js";

export function handleLiveness(_req: Request, res: Response): void {
  res.status(200).json({ status: "ok", service: "billing-api" });
}

export async function handleReadiness(deps: Deps, _req: Request, res: Response): Promise<void> {
  const report = await runHealthChecks(deps.healthChecks);
  const statusCode = report.status === "unhealthy" ? 503 : 200;
  res.status(statusCode).json(report);
}

export function makeReadinessHandler(deps: Deps) {
  return (req: Request, res: Response): Promise<void> => handleReadiness(deps, req, res);
}
