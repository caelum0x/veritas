// Keys feature routes — mounts API key management endpoints on the router
import { Router } from "express";
import { systemClock } from "@veritas/core";
import type { AppDeps } from "../../app.js";
import { requireAuth } from "../../middleware/auth.js";
import { KeysService } from "./keys.service.js";
import { KeysController } from "./keys.controller.js";

export function registerKeysRoutes(router: Router, deps: AppDeps): void {
  const service = new KeysService({
    portalService: deps.portalService,
    logger: deps.logger,
    clock: systemClock,
  });
  const ctrl = new KeysController(service);

  const keysRouter = Router();
  keysRouter.use(requireAuth());

  keysRouter.get("/", (req, res, next) => ctrl.list(req, res, next));
  keysRouter.post("/", (req, res, next) => ctrl.create(req, res, next));
  keysRouter.get("/:id", (req, res, next) => ctrl.get(req, res, next));
  keysRouter.post("/:id/revoke", (req, res, next) => ctrl.revoke(req, res, next));

  router.use("/keys", keysRouter);
}
