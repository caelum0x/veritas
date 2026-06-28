// Express router registration for the roles feature.
import type { Router } from "express";
import type { Deps } from "../../container.js";
import { RolesService } from "./roles.service.js";
import { makeRolesController } from "./roles.controller.js";

/** Register all /roles sub-routes onto the provided router using deps. */
export function registerRolesRoutes(router: Router, deps: Deps): void {
  const service = new RolesService({ roleStore: deps.roleStore, logger: deps.logger });
  const ctrl = makeRolesController(service);

  router.get("/", ctrl.list);
  router.post("/", ctrl.create);
  router.get("/:id", ctrl.getById);
  router.patch("/:id", ctrl.update);
  router.delete("/:id", ctrl.remove);
  router.get("/:id/permissions", ctrl.getPermissions);
  router.get("/:id/effective-roles", ctrl.getEffectiveRoles);
}
