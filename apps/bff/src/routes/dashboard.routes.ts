// BFF dashboard route: aggregates usage, recent verifications, and billing summary for the UI.
import type { Logger } from "@veritas/core";
import type { VeritasClient } from "@veritas/sdk/client.js";
import type { Router } from "express";

interface DashboardDeps {
  client: VeritasClient;
  logger: Logger;
}

interface DashboardSummary {
  recentVerifications: readonly unknown[];
  usageSummary: unknown;
  activeSubscription: unknown | null;
}

async function getDashboardSummary(client: VeritasClient): Promise<DashboardSummary> {
  const [verificationsResult, usageResult] = await Promise.allSettled([
    client.verification.list({ limit: 5 }),
    client.usage.list({ limit: 1 }),
  ]);

  const recentVerifications =
    verificationsResult.status === "fulfilled"
      ? (verificationsResult.value.data ?? [])
      : [];

  const usageSummary =
    usageResult.status === "fulfilled" ? usageResult.value : null;

  let activeSubscription: unknown | null = null;
  try {
    const subs = await client.subscriptions.list({ status: "active", limit: 1 });
    activeSubscription = subs[0] ?? null;
  } catch {
    activeSubscription = null;
  }

  return { recentVerifications, usageSummary, activeSubscription };
}

export function registerDashboardRoutes(router: Router, deps: DashboardDeps): void {
  const { client, logger } = deps;

  router.get("/dashboard", async (req, res, next) => {
    try {
      const summary = await getDashboardSummary(client);
      res.json({ success: true, data: summary });
    } catch (err) {
      logger.error("dashboard summary failed", { error: err });
      next(err);
    }
  });

  router.get("/dashboard/recent-verifications", async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query["limit"] ?? 10), 50);
      const result = await client.verification.list({ limit });
      res.json({ success: true, data: result.data ?? [] });
    } catch (err) {
      logger.error("recent-verifications fetch failed", { error: err });
      next(err);
    }
  });
}
