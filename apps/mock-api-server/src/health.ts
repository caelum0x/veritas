// Health endpoint handler — runs all registered checks and returns an aggregate report.
import type { Request, Response } from "express";
import { runHealthChecks } from "@veritas/observability";
import type { Deps } from "./container.js";

export function registerHealthRoutes(
  app: { get: (path: string, handler: (req: Request, res: Response) => void) => void },
  deps: Deps,
): void {
  app.get("/health", async (_req: Request, res: Response): Promise<void> => {
    const report = await runHealthChecks(deps.healthChecks);
    const statusCode = report.status === "unhealthy" ? 503 : 200;
    res.status(statusCode).json(report);
  });

  app.get("/health/live", (_req: Request, res: Response): void => {
    res.json({ status: "ok" });
  });

  app.get("/health/ready", async (_req: Request, res: Response): Promise<void> => {
    const report = await runHealthChecks(deps.healthChecks);
    const statusCode = report.status === "unhealthy" ? 503 : 200;
    res.status(statusCode).json(report);
  });
}
