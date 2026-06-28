// Express router wiring credit balance and transaction endpoints.
import { Router } from "express";
import type { CreditsController } from "../controllers/credits.controller.js";

export function createCreditsRouter(ctrl: CreditsController): Router {
  const router = Router();

  // Balance query
  router.get("/:userId/balance", (req, res, next) => ctrl.getBalance(req, res, next));

  // Expire stale grants for a user
  router.post("/:userId/expire", (req, res, next) => ctrl.expireCredits(req, res, next));

  // Grant credits
  router.post("/grant", (req, res, next) => ctrl.grant(req, res, next));

  // Consume credits
  router.post("/consume", (req, res, next) => ctrl.consume(req, res, next));

  // Reserve credits
  router.post("/reserve", (req, res, next) => ctrl.reserve(req, res, next));

  // Release reservation
  router.post("/release", (req, res, next) => ctrl.release(req, res, next));

  return router;
}
