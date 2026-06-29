// Usage routes — registers usage summary, time-series, quota, and analytics endpoints
import { Router } from "express";
import { requirePortalAuth } from "../../middleware/auth.js";
import { UsageController } from "./usage.controller.js";
import type { UsageService } from "./usage.service.js";

export interface UsageRouteDeps {
  readonly usageService: UsageService;
}

export function registerUsageRoutes(router: Router, deps: UsageRouteDeps): void {
  const ctrl = new UsageController(deps.usageService);

  router.use(requirePortalAuth);

  /** GET /usage — aggregated usage summary for an app and time period */
  router.get("/", (req, res, next) => ctrl.getSummary(req, res, next));

  /** GET /usage/timeseries — request-count time-series points */
  router.get("/timeseries", (req, res, next) => ctrl.getTimeSeries(req, res, next));

  /** GET /usage/quota — current quota consumption and limits */
  router.get("/quota", (req, res, next) => ctrl.getQuota(req, res, next));

  /** GET /usage/analytics — full analytics report from api-analytics store */
  router.get("/analytics", (req, res, next) => ctrl.getAnalyticsReport(req, res, next));
}
