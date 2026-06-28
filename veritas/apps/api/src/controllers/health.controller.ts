// Health controller handlers: liveness and readiness probes for the API server.
import type { Request, Response } from "express";
import type { Container } from "@veritas/container";
import type { AppConfig } from "@veritas/config";
import { asyncHandler } from "../http/async-handler.js";

interface HealthStatus {
  status: "ok" | "degraded" | "down";
  version: string;
  uptime: number;
  checks: Record<string, { status: "ok" | "down"; latencyMs?: number; error?: string }>;
}

async function checkDatabase(container: Container): Promise<{ status: "ok" | "down"; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (container as any).db as { query?: (sql: string) => Promise<unknown> } | undefined;
    if (db && typeof db.query === "function") {
      await db.query("SELECT 1");
    }
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function buildHealthHandlers(container: Container, config: AppConfig) {
  const liveness = asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() });
  });

  const readiness = asyncHandler(async (_req: Request, res: Response) => {
    const dbCheck = await checkDatabase(container);

    const checks: HealthStatus["checks"] = { database: dbCheck };
    const allOk = Object.values(checks).every((c) => c.status === "ok");
    const anyDown = Object.values(checks).some((c) => c.status === "down");

    const overallStatus: HealthStatus["status"] = allOk ? "ok" : anyDown ? "down" : "degraded";

    const body: HealthStatus = {
      status: overallStatus,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      version: (config as any).version ?? process.env["npm_package_version"] ?? "unknown",
      uptime: process.uptime(),
      checks,
    };

    const httpStatus = overallStatus === "ok" ? 200 : overallStatus === "degraded" ? 207 : 503;
    res.status(httpStatus).json(body);
  });

  return { liveness, readiness };
}
