// Registers metrics routes on the provided router using the Deps container.
import { Router } from "express";
import type { Deps } from "../../container.js";
import { MetricsService } from "./metrics.service.js";
import { MetricsController } from "./metrics.controller.js";

export function registerMetricsRoutes(router: Router, deps: Deps): void {
  const service = new MetricsService(deps);
  const controller = new MetricsController(service);

  // Verification KPIs for a specific organization
  router.get("/verification", controller.getVerificationMetrics);

  // Aggregated platform-wide KPIs (admin)
  router.get("/platform", controller.getPlatformMetrics);

  // Trust score trends for an organization
  router.get("/trust-trends", controller.getTrustTrends);

  // Full analytics report for an organization
  router.get("/report", controller.getAnalyticsReport);

  // Raw event listing with filters
  router.get("/events", controller.listEvents);

  // Ingest a single analytics event
  router.post("/events", controller.trackEvent);
}
