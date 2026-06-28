// Registers all /capacity routes on the provided Express router using the Deps container.
import type { Router } from "express";
import type { Deps } from "../../container.js";
import { CapacityFeatureService } from "./capacity.service.js";
import { CapacityController } from "./capacity.controller.js";

export function registerCapacityRoutes(router: Router, deps: Deps): void {
  const service = new CapacityFeatureService({
    metricSource: deps.metricSource,
    logger: deps.logger,
  });
  const ctrl = new CapacityController(service);

  // Ingest raw metric samples into the in-memory metric buffer
  router.post("/samples", (req, res, next) => ctrl.addSamples(req, res, next));

  // Compute a full capacity plan for a given model
  router.post("/plan", (req, res, next) => ctrl.plan(req, res, next));

  // Retrieve saturation status for resources over a look-back window
  router.get("/saturation", (req, res, next) => ctrl.saturation(req, res, next));

  // Retrieve utilisation forecasts over a projection horizon
  router.get("/forecast", (req, res, next) => ctrl.forecast(req, res, next));

  // Retrieve scaling recommendations based on current utilization trends
  router.get("/recommend", (req, res, next) => ctrl.recommend(req, res, next));

  // Build a comprehensive capacity report for a model and time window
  router.post("/report", (req, res, next) => ctrl.buildReport(req, res, next));
}
