// Express router wiring trial lifecycle: start, query, extend, convert, and eligibility endpoints.
import { Router } from "express";
import type { TrialsController } from "../controllers/trials.controller.js";

export function createTrialsRouter(ctrl: TrialsController): Router {
  const router = Router();

  // User-scoped sub-routes declared first to avoid shadowing /:trialId
  router.get("/users/:userId/active", (req, res, next) => ctrl.getActiveForUser(req, res, next));
  router.get("/users/:userId/eligibility", (req, res, next) => ctrl.checkEligibility(req, res, next));

  // Start a new trial
  router.post("/", (req, res, next) => ctrl.create(req, res, next));

  // Get a trial by id
  router.get("/:trialId", (req, res, next) => ctrl.getById(req, res, next));

  // Extend a trial
  router.post("/:trialId/extend", (req, res, next) => ctrl.extend(req, res, next));

  // Convert a trial to paid subscription
  router.post("/:trialId/convert", (req, res, next) => ctrl.convert(req, res, next));

  return router;
}
