// Express router registration for the plans feature.
import type { Router } from "express";
import type { Deps } from "../../container.js";
import { PlansService } from "./plans.service.js";
import { makePlansController } from "./plans.controller.js";

/** Register all /plans sub-routes onto the provided router using deps. */
export function registerPlansRoutes(router: Router, deps: Deps): void {
  const service = new PlansService({ planService: deps.planService, logger: deps.logger });
  const ctrl = makePlansController(service);

  router.get("/", ctrl.list);
  router.post("/", ctrl.create);
  router.get("/:id", ctrl.getById);
  router.patch("/:id", ctrl.update);
  router.post("/:id/deactivate", ctrl.deactivate);
  router.delete("/:id", ctrl.remove);
}
