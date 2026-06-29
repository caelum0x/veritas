// Mounts all referral endpoints on the given router; called by the root router.
import type { Router } from "express";
import type { Deps } from "../../container.js";
import { ReferralsService } from "./referrals.service.js";
import { ReferralsController } from "./referrals.controller.js";

export function registerReferralsRoutes(router: Router, deps: Deps): void {
  const svc = new ReferralsService(deps);
  const ctrl = new ReferralsController(svc);

  // Program management
  router.post("/referrals/programs", (req, res, next) => ctrl.createProgram(req, res, next));
  router.get("/referrals/programs", (req, res, next) => ctrl.listPrograms(req, res, next));
  router.get("/referrals/programs/:programId", (req, res, next) => ctrl.getProgram(req, res, next));

  // Code generation
  router.get("/referrals/users/:userId/code", (req, res, next) => ctrl.generateCode(req, res, next));

  // List referrals by referrer
  router.get("/referrals/by-referrer/:referrerId", (req, res, next) => ctrl.listByReferrer(req, res, next));

  // Click tracking
  router.post("/referrals/clicks", (req, res, next) => ctrl.registerClick(req, res, next));

  // Signup attribution
  router.post("/referrals/attribute", (req, res, next) => ctrl.attributeSignup(req, res, next));

  // Issue rewards for an attributed referral
  router.post("/referrals/:referralId/rewards", (req, res, next) => ctrl.issueRewards(req, res, next));
}
