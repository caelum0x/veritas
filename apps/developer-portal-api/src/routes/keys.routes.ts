// Keys routes — API key creation, listing, and revocation endpoints
import { Router } from "express";
import { KeysController } from "../controllers/keys.controller.js";
import { requireAuth } from "../middleware/auth.js";
import type { AppDeps } from "../app.js";

export function keysRouter(deps: AppDeps): Router {
  const router = Router();
  const ctrl = new KeysController(deps.portalService);

  router.use(requireAuth());

  router.get("/", (req, res, next) => ctrl.list(req, res, next));
  router.post("/", (req, res, next) => ctrl.create(req, res, next));
  router.get("/:id", (req, res, next) => ctrl.get(req, res, next));
  router.post("/:id/revoke", (req, res, next) => ctrl.revoke(req, res, next));

  return router;
}
