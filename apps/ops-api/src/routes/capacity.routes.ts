// Express router for /capacity endpoints — samples ingestion, planning, saturation, and forecasts.
import { Router } from "express";
import type { CapacityController } from "../controllers/capacity.controller.js";

export function makeCapacityRouter(ctrl: CapacityController): Router {
  const router = Router();

  // Ingest raw metric samples into the in-memory metric source
  router.post("/samples", (req, res, next) => ctrl.addSamples(req, res, next));

  // Compute a full capacity plan for a given model
  router.post("/plan", (req, res, next) => ctrl.plan(req, res, next));

  // Retrieve saturation status for resources over a look-back window
  router.get("/saturation", (req, res, next) => ctrl.saturation(req, res, next));

  // Retrieve utilisation forecast over a projection horizon
  router.get("/forecast", (req, res, next) => ctrl.forecast(req, res, next));

  return router;
}
