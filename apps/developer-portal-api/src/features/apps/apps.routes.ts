// Apps feature routes — mounts all app CRUD and lifecycle endpoints on the router
import { Router } from "express";
import type { AppDeps } from "../../app.js";
import { requireAuth } from "../../middleware/auth.js";
import { AppsService } from "./apps.service.js";
import { AppsController } from "./apps.controller.js";

export function registerAppsRoutes(router: Router, deps: AppDeps): void {
  const service = new AppsService({ portalService: deps.portalService, logger: deps.logger });
  const ctrl = new AppsController(service);

  const appsRouter = Router();
  appsRouter.use(requireAuth());

  appsRouter.get("/", (req, res, next) => ctrl.list(req, res, next));
  appsRouter.post("/", (req, res, next) => ctrl.create(req, res, next));
  appsRouter.get("/:id", (req, res, next) => ctrl.get(req, res, next));
  appsRouter.patch("/:id", (req, res, next) => ctrl.update(req, res, next));
  appsRouter.post("/:id/suspend", (req, res, next) => ctrl.suspend(req, res, next));
  appsRouter.post("/:id/activate", (req, res, next) => ctrl.activate(req, res, next));
  appsRouter.delete("/:id", (req, res, next) => ctrl.delete(req, res, next));

  router.use("/apps", appsRouter);
}
