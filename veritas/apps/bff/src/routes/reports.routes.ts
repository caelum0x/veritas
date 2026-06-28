// BFF reports route: retrieves and lists verification reports from the upstream API.
import type { Logger } from "@veritas/core";
import type { VeritasClient } from "@veritas/sdk/client.js";
import type { Router } from "express";

interface ReportsDeps {
  client: VeritasClient;
  logger: Logger;
}

export function registerReportsRoutes(router: Router, deps: ReportsDeps): void {
  const { client, logger } = deps;

  router.get("/reports", async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query["limit"] ?? 20), 100);
      const cursor = typeof req.query["cursor"] === "string" ? req.query["cursor"] : undefined;
      const claimId = typeof req.query["claimId"] === "string" ? req.query["claimId"] : undefined;

      const page = await client.reports.list({ limit, cursor, claimId });
      res.json({ success: true, data: page });
    } catch (err) {
      logger.error("list reports error", { error: err });
      next(err);
    }
  });

  router.get("/reports/:reportId", async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const report = await client.reports.get(reportId);
      res.json({ success: true, data: report });
    } catch (err) {
      logger.error("get report error", { error: err, reportId: req.params["reportId"] });
      next(err);
    }
  });
}
