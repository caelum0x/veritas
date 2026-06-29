// Express router wiring referral program and referral action endpoints.
import { Router } from "express";
import type { ReferralsController } from "../controllers/referrals.controller.js";

export function createReferralsRouter(ctrl: ReferralsController): Router {
  const router = Router();

  // Program management
  router.post("/programs", (req, res, next) => ctrl.createProgram(req, res, next));

  // Code generation for a user
  router.get("/users/:userId/code", (req, res, next) => ctrl.generateCode(req, res, next));

  // List referrals by referrer
  router.get("/by-referrer/:referrerId", (req, res, next) => ctrl.listByReferrer(req, res, next));

  // Click tracking
  router.post("/clicks", (req, res, next) => ctrl.registerClick(req, res, next));

  // Attribution (signup)
  router.post("/attribute", (req, res, next) => ctrl.attributeSignup(req, res, next));

  // Issue rewards for a completed referral
  router.post("/:referralId/rewards", (req, res, next) => ctrl.issueRewards(req, res, next));

  return router;
}
