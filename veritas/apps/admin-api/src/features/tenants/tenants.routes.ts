// Tenant routes: mounts CRUD and ownership-transfer endpoints on the provided router.
import type { Router } from "express";
import type { Deps } from "../../container.js";
import { asyncHandler } from "../../http/async-handler.js";
import { TenantsService } from "./tenants.service.js";
import { TenantsController } from "./tenants.controller.js";

/** Register all tenant routes on the given Express router. */
export function registerTenantsRoutes(router: Router, deps: Deps): void {
  const service = new TenantsService({
    orgService: deps.orgService,
    auditLogService: deps.auditLogService,
  });
  const ctrl = new TenantsController(service);

  router.post("/", asyncHandler((req, res, next) => ctrl.create(req, res, next)));
  router.get("/", asyncHandler((req, res, next) => ctrl.list(req, res, next)));
  router.get("/:orgId", asyncHandler((req, res, next) => ctrl.getById(req, res, next)));
  router.patch("/:orgId", asyncHandler((req, res, next) => ctrl.update(req, res, next)));
  router.delete("/:orgId", asyncHandler((req, res, next) => ctrl.delete(req, res, next)));
  router.post(
    "/:orgId/transfer-ownership",
    asyncHandler((req, res, next) => ctrl.transferOwnership(req, res, next)),
  );
}
