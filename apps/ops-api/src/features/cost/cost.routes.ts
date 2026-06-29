// Registers all /cost routes on the provided Express router using the Deps container.
import type { Router } from "express";
import type { Deps } from "../../container.js";
import { CostFeatureService } from "./cost.service.js";
import { CostController } from "./cost.controller.js";

export function registerCostRoutes(router: Router, deps: Deps): void {
  const service = new CostFeatureService({
    costStore: deps.costStore,
    budgetRepo: deps.budgetRepo,
    allocationRepo: deps.allocationRepo,
    alertRepo: deps.alertRepo,
    costAggregator: deps.costAggregator,
    costOptimizer: deps.costOptimizer,
    costReportBuilder: deps.costReportBuilder,
    logger: deps.logger,
  });
  const ctrl = new CostController(service);

  // Cost events
  router.get("/events", (req, res, next) => ctrl.listEvents(req, res, next));
  router.post("/events", (req, res, next) => ctrl.createEvent(req, res, next));
  router.get("/events/:id", (req, res, next) => ctrl.getEvent(req, res, next));

  // Budgets
  router.get("/budgets", (req, res, next) => ctrl.listBudgets(req, res, next));
  router.post("/budgets", (req, res, next) => ctrl.createBudget(req, res, next));
  router.get("/budgets/:id", (req, res, next) => ctrl.getBudget(req, res, next));

  // Budget alerts
  router.get("/alerts", (req, res, next) => ctrl.listAlerts(req, res, next));
  router.post("/alerts", (req, res, next) => ctrl.createBudgetAlert(req, res, next));

  // Allocations
  router.get("/allocations", (req, res, next) => ctrl.listAllocations(req, res, next));

  // Aggregation
  router.get("/aggregate", (req, res, next) => ctrl.aggregate(req, res, next));

  // Reports
  router.get("/reports", (req, res, next) => ctrl.listReports(req, res, next));
  router.post("/reports", (req, res, next) => ctrl.buildReport(req, res, next));

  // Forecasts
  router.get("/forecasts", (req, res, next) => ctrl.listForecasts(req, res, next));
}
