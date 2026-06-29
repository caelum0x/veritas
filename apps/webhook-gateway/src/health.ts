// Health endpoint handler — runs registered HealthChecks and returns aggregate report.

import type { Request, Response } from "express";
import { runHealthChecks } from "@veritas/observability";
import type { Deps } from "./container.js";

export function createHealthHandler(deps: Pick<Deps, "healthChecks">) {
  return async function healthHandler(_req: Request, res: Response): Promise<void> {
    const report = await runHealthChecks(deps.healthChecks);
    const statusCode = report.status === "unhealthy" ? 503 : 200;
    res.status(statusCode).json(report);
  };
}
