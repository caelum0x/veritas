// Health BFF route: liveness and readiness probes for load balancer and orchestration checks.
import type { Router } from "express";

export interface HealthCheckResult {
  readonly status: "ok" | "degraded" | "down";
  readonly version: string;
  readonly uptime: number;
  readonly timestamp: string;
}

const startTime = Date.now();

function getVersion(): string {
  return process.env["npm_package_version"] ?? process.env["APP_VERSION"] ?? "unknown";
}

export function registerHealthRoutes(router: Router): void {
  router.get("/health", (_req, res) => {
    const result: HealthCheckResult = {
      status: "ok",
      version: getVersion(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(result);
  });

  router.get("/health/live", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  router.get("/health/ready", (_req, res) => {
    res.status(200).json({ status: "ok", uptime: Math.floor((Date.now() - startTime) / 1000) });
  });
}
