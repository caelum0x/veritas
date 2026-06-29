// Consent routes: grant, deny, withdraw, list, and check consent records.

import { Router, type Request, type Response, type NextFunction } from "express";
import { ConsentController, type IConsentStore } from "../controllers/consent.controller.js";
import { requireAuth } from "../middleware/auth.js";

export function buildConsentRouter(store: IConsentStore): Router {
  const router = Router();
  const ctrl = new ConsentController(store);

  // POST /consents/grant — record a granted consent decision
  router.post("/grant", requireAuth, (req: Request, res: Response, next: NextFunction) => ctrl.grant(req, res, next));

  // POST /consents/deny — record a denied consent decision
  router.post("/deny", requireAuth, (req: Request, res: Response, next: NextFunction) => ctrl.deny(req, res, next));

  // POST /consents/withdraw — withdraw a previously granted consent
  router.post("/withdraw", requireAuth, (req: Request, res: Response, next: NextFunction) => ctrl.withdraw(req, res, next));

  // GET /consents — list consents for a user (userId query param)
  router.get("/", requireAuth, (req: Request, res: Response, next: NextFunction) => ctrl.listByUser(req, res, next));

  // GET /consents/check — check if a user has an active grant for a purpose
  router.get("/check", requireAuth, (req: Request, res: Response, next: NextFunction) => ctrl.check(req, res, next));

  return router;
}
