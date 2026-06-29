// Registers reports feature routes onto an Express router with full service wiring.
import { Router } from "express";
import type { Deps } from "../../container.js";
import { ReportsService } from "./reports.service.js";
import { makeReportsController } from "./reports.controller.js";

export function registerReportsRoutes(router: Router, deps: Deps): void {
  const analyticsStore = deps.analyticsStore;

  const reportsService = new ReportsService({
    reportStore: deps.reportStore,
    templateStore: deps.templateStore,
    analyticsStore: analyticsStore,
    logger: deps.logger,
  });

  const ctrl = makeReportsController({ reportsService });

  router.get("/reports", (req, res, next) => ctrl.listReports(req, res).catch(next));
  router.get("/reports/templates", (req, res, next) => ctrl.listTemplates(req, res).catch(next));
  router.get("/reports/:id", (req, res, next) => ctrl.getReport(req, res).catch(next));
  router.post("/reports", (req, res, next) => ctrl.createReport(req, res).catch(next));
  router.post("/reports/generate", (req, res, next) => ctrl.generateReport(req, res).catch(next));
  router.post("/reports/analytics", (req, res, next) => ctrl.queryAnalytics(req, res).catch(next));
  router.patch("/reports/:id", (req, res, next) => ctrl.updateReport(req, res).catch(next));
  router.delete("/reports/:id", (req, res, next) => ctrl.deleteReport(req, res).catch(next));
}
