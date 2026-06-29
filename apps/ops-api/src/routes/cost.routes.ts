// Express router for /cost endpoints — events, budgets, allocations, reports, forecasts, and alerts.
import { Router } from "express";
import type { CostController } from "../controllers/cost.controller.js";

export function makeCostRouter(ctrl: CostController): Router {
  const router = Router();

  router.get("/events", (req, res, next) => ctrl.listEvents(req, res, next));
  router.post("/events", (req, res, next) => ctrl.createEvent(req, res, next));
  router.get("/events/:id", (req, res, next) => ctrl.getEvent(req, res, next));

  router.get("/budgets", (req, res, next) => ctrl.listBudgets(req, res, next));
  router.post("/budgets", (req, res, next) => ctrl.createBudget(req, res, next));
  router.get("/budgets/:id", (req, res, next) => ctrl.getBudget(req, res, next));

  router.get("/allocations", (req, res, next) => ctrl.listAllocations(req, res, next));
  router.get("/allocations/:id", (req, res, next) => ctrl.getAllocation(req, res, next));

  router.get("/reports", (req, res, next) => ctrl.listReports(req, res, next));
  router.get("/forecasts", (req, res, next) => ctrl.listForecasts(req, res, next));
  router.get("/alerts", (req, res, next) => ctrl.listAlerts(req, res, next));

  return router;
}
