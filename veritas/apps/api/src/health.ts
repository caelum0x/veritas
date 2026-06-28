// Health-check endpoint helpers using @veritas/observability health utilities.
import type { Router, Request, Response } from "express";
import { runHealthChecks, AlwaysHealthyCheck } from "@veritas/observability";
import type { HealthCheck } from "@veritas/observability";
import type { Deps } from "./container.js";

/** Build and return the list of health checks for this service. */
function buildChecks(_deps: Deps): HealthCheck[] {
  return [
    new AlwaysHealthyCheck("api"),
  ];
}

/** Register /healthz and /readyz endpoints on the supplied router. */
export function registerHealthRoutes(router: Router, deps: Deps): void {
  const checks = buildChecks(deps);

  router.get("/healthz", (_req: Request, res: Response): void => {
    res.status(200).json({ status: "ok" });
  });

  router.get("/readyz", async (_req: Request, res: Response): Promise<void> => {
    const report = await runHealthChecks(checks);
    const status = report.status === "healthy" ? 200 : 503;
    res.status(status).json(report);
  });
}
