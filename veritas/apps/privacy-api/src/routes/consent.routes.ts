// Consent routes: grant, deny, withdraw, list, and check consent records.

import { Router } from "express";
import { ConsentController, type IConsentStore } from "../controllers/consent.controller.js";
import { requireAuth } from "../middleware/auth.js";

export function buildConsentRouter(store: IConsentStore): Router {
  const router = Router();
  const ctrl = new ConsentController(store);

  // POST /consents/grant — record a granted consent decision
  router.post("/grant", requireAuth, (req, res, next) => ctrl.grant(req, res, next));

  // POST /consents/deny — record a denied consent decision
  router.post("/deny", requireAuth, (req, res, next) => ctrl.deny(req, res, next));

  // POST /consents/withdraw — withdraw a previously granted consent
  router.post("/withdraw", requireAuth, (req, res, next) => ctrl.withdraw(req, res, next));

  // GET /consents — list consents for a user (userId query param)
  router.get("/", requireAuth, (req, res, next) => ctrl.listByUser(req, res, next));

  // GET /consents/check — check if a user has an active grant for a purpose
  router.get("/check", requireAuth, (req, res, next) => ctrl.check(req, res, next));

  return router;
}
