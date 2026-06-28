// Consent routes: registers all consent endpoints on the provided router with auth guard.

import type { Router } from "express";
import type { ConsentServiceDeps } from "./consent.service.js";
import { requireAuth } from "../../middleware/auth.js";
import { ConsentService } from "./consent.service.js";
import { ConsentController } from "./consent.controller.js";

export function registerConsentRoutes(router: Router, deps: ConsentServiceDeps): void {
  const service = new ConsentService(deps);
  const ctrl = new ConsentController(service);

  // POST /consents/capture — full consent-capture flow with event emission (before /grant etc.)
  router.post("/consents/capture", requireAuth, (req, res, next) => ctrl.capture(req, res, next));

  // POST /consents/grant — record a granted consent decision
  router.post("/consents/grant", requireAuth, (req, res, next) => ctrl.grant(req, res, next));

  // POST /consents/deny — record a denied consent decision
  router.post("/consents/deny", requireAuth, (req, res, next) => ctrl.deny(req, res, next));

  // POST /consents/withdraw — withdraw a previously granted consent
  router.post("/consents/withdraw", requireAuth, (req, res, next) => ctrl.withdraw(req, res, next));

  // GET /consents/check — check if user has an active grant for a purpose (before /consents)
  router.get("/consents/check", requireAuth, (req, res, next) => ctrl.check(req, res, next));

  // GET /consents — list consents for a user
  router.get("/consents", requireAuth, (req, res, next) => ctrl.list(req, res, next));
}
