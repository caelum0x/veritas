// Apps routes — CRUD and lifecycle endpoints for developer applications
import { Router } from "express";
import { AppsController } from "../controllers/apps.controller.js";
import { requireAuth } from "../middleware/auth.js";
import type { AppDeps } from "../app.js";

export function appsRouter(deps: AppDeps): Router {
  const router = Router();
  const ctrl = new AppsController(deps.portalService);

  router.use(requireAuth());

  router.get("/", (req, res, next) => ctrl.list(req, res, next));
  router.post("/", (req, res, next) => ctrl.create(req, res, next));
  router.get("/:id", (req, res, next) => ctrl.get(req, res, next));
  router.patch("/:id", (req, res, next) => ctrl.update(req, res, next));
  router.post("/:id/suspend", (req, res, next) => ctrl.suspend(req, res, next));
  router.post("/:id/activate", (req, res, next) => ctrl.activate(req, res, next));
  router.delete("/:id", (req, res, next) => ctrl.delete(req, res, next));

  return router;
}
