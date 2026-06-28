// usage.routes.ts: mount usage metering endpoints under /usage.

import { Router } from "express";
import { UsageController } from "../controllers/usage.controller.js";
import type { UsageMeter } from "@veritas/usage-billing";

export function usageRouter(usageMeter: UsageMeter): Router {
  const router = Router();
  const ctrl = new UsageController(usageMeter);

  /** GET /usage — list recorded usage events (stub, returns empty page) */
  router.get("/", (req, res) => ctrl.list(req, res));

  /** POST /usage/record — record a usage event for an organization */
  router.post("/record", (req, res) => ctrl.record(req, res));

  return router;
}
