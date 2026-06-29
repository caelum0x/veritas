// Mounts all trial lifecycle endpoints and exports registerTrialsRoutes.
import { Router } from "express";
import { TrialsService } from "./trials.service.js";
import { TrialsFeatureController } from "./trials.controller.js";

export function registerTrialsRoutes(router: Router): void {
  const service = new TrialsService();
  const ctrl = new TrialsFeatureController(service);

  // User-scoped sub-routes declared before /:trialId to prevent shadowing
  router.get("/users/:userId/active", (req, res, next) => ctrl.getActiveForUser(req, res, next));
  router.get("/users/:userId/eligibility", (req, res, next) => ctrl.checkEligibility(req, res, next));

  // Start a new trial
  router.post("/", (req, res, next) => ctrl.create(req, res, next));

  // Get a trial by id
  router.get("/:trialId", (req, res, next) => ctrl.getById(req, res, next));

  // Extend a trial
  router.post("/:trialId/extend", (req, res, next) => ctrl.extend(req, res, next));

  // Convert a trial to a paid subscription
  router.post("/:trialId/convert", (req, res, next) => ctrl.convert(req, res, next));
}
