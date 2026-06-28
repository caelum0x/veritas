// Registers usage feature routes on the provided router under /usage.

import type { Router } from "express";
import type { Deps } from "../../container.js";
import { UsageService } from "./usage.service.js";
import { UsageController } from "./usage.controller.js";

export function registerUsageRoutes(router: Router, deps: Deps): void {
  const service = new UsageService(deps);
  const ctrl = new UsageController(service);

  /** POST /usage/record — record a usage event for an organization */
  router.post("/usage/record", (req, res) => ctrl.record(req, res));

  /** GET /usage — list aggregated usage periods for an organization */
  router.get("/usage", (req, res) => ctrl.list(req, res));
}
