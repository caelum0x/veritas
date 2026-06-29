// Health endpoint: exposes /healthz (liveness) and /readyz (readiness) for the platform process.

import { Router } from "express";
import type { Logger } from "@veritas/core";
import { runHealthChecks, aggregateStatus } from "@veritas/observability";
import type { HealthCheck } from "@veritas/observability";

export interface HealthRouterOptions {
  readonly checks: readonly HealthCheck[];
  readonly logger: Logger;
  readonly version?: string;
}

/** Build an Express Router exposing /healthz and /readyz probes. */
export function buildHealthRouter(opts: HealthRouterOptions): Router {
  const { checks, logger, version } = opts;
  const router = Router();

  router.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok", version: version ?? "unknown" });
  });

  router.get("/readyz", async (_req, res) => {
    try {
      const report = await runHealthChecks(checks);
      const status = aggregateStatus(report.components);
      const httpStatus = status === "unhealthy" ? 503 : 200;
      res.status(httpStatus).json({
        status,
        checkedAt: report.checkedAt,
        version: version ?? "unknown",
        components: report.components,
      });
    } catch (err) {
      logger.error("Health check failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(503).json({ status: "unhealthy", error: "Health check error" });
    }
  });

  return router;
}
