// Usage BFF route: exposes usage metrics and summary for the UI dashboard.
import type { Logger } from "@veritas/core";
import type { VeritasClient } from "@veritas/sdk/client.js";
import type { Router } from "express";
import { toUsageSummaryViewModel } from "../view-model.js";

interface UsageRouteDeps {
  readonly client: VeritasClient;
  readonly logger: Logger;
}

export function registerUsageRoutes(router: Router, deps: UsageRouteDeps): void {
  const { client, logger } = deps;

  router.get("/usage", async (req, res, next) => {
    try {
      const metric = typeof req.query["metric"] === "string" ? req.query["metric"] : undefined;
      const from = typeof req.query["from"] === "string" ? req.query["from"] : undefined;
      const to = typeof req.query["to"] === "string" ? req.query["to"] : undefined;
      const limit = req.query["limit"] !== undefined ? Math.min(Number(req.query["limit"]), 100) : 50;

      const records = await client.usage.list({ metric, from, to, limit });
      const data = records.map(toUsageSummaryViewModel);
      res.json({ success: true, data });
    } catch (error) {
      logger.error("usage list failed", { error });
      next(error);
    }
  });

  router.get("/usage/summary", async (req, res, next) => {
    try {
      const from = typeof req.query["from"] === "string" ? req.query["from"] : undefined;
      const to = typeof req.query["to"] === "string" ? req.query["to"] : undefined;

      const summary = await client.usage.summary({ from, to });
      res.json({ success: true, data: summary });
    } catch (error) {
      logger.error("usage summary failed", { error });
      next(error);
    }
  });

  router.get("/usage/metrics/:metric", async (req, res, next) => {
    try {
      const { metric } = req.params as { metric: string };
      const from = typeof req.query["from"] === "string" ? req.query["from"] : undefined;
      const to = typeof req.query["to"] === "string" ? req.query["to"] : undefined;

      const records = await client.usage.getByMetric(metric, { from, to });
      const data = records.map(toUsageSummaryViewModel);
      res.json({ success: true, data });
    } catch (error) {
      logger.error("usage by metric failed", { error, metric: req.params["metric"] });
      next(error);
    }
  });
}
