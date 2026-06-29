// Mounts all credit endpoints on the given router; called by the root router.
import type { Router } from "express";
import type { Deps } from "../../container.js";
import { CreditsService } from "./credits.service.js";
import { CreditsController } from "./credits.controller.js";

export function registerCreditsRoutes(router: Router, deps: Deps): void {
  const svc = new CreditsService(deps);
  const ctrl = new CreditsController(svc);

  // Balance query
  router.get("/credits/:userId/balance", (req, res, next) => ctrl.getBalance(req, res, next));

  // Ledger history
  router.get("/credits/:userId/ledger", (req, res, next) => ctrl.getLedger(req, res, next));

  // Expire stale grants
  router.post("/credits/:userId/expire", (req, res, next) => ctrl.expireCredits(req, res, next));

  // Grant credits to a user
  router.post("/credits/grant", (req, res, next) => ctrl.grant(req, res, next));

  // Consume credits from a user's balance
  router.post("/credits/consume", (req, res, next) => ctrl.consume(req, res, next));

  // Reserve credits (hold for a pending operation)
  router.post("/credits/reserve", (req, res, next) => ctrl.reserve(req, res, next));

  // Commit or release a reservation
  router.post("/credits/release", (req, res, next) => ctrl.release(req, res, next));
}
