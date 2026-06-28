// Usage feature routes: mounts metering endpoints and wires the feature service from deps.
import { type Router } from "express";
import { TOKENS } from "@veritas/container";
import type { Container } from "@veritas/container";
import type { UsageMeteringService } from "@veritas/services";
import type { Logger } from "@veritas/core";
import { authenticate } from "../../middleware/auth.js";
import { parsePagination } from "../../middleware/pagination.js";
import { UsageFeatureService } from "./usage.service.js";
import { makeUsageController } from "./usage.controller.js";

export interface UsageDepsContainer {
  readonly container: Container;
}

export function registerUsageRoutes(
  router: Router,
  deps: UsageDepsContainer,
): void {
  const usageMeteringService = deps.container.resolve(
    TOKENS.UsageMeteringSvc,
  ) as UsageMeteringService;
  const logger = deps.container.resolve(TOKENS.Logger) as Logger;

  const featureService = new UsageFeatureService({ usageMeteringService, logger });
  const ctrl = makeUsageController(featureService);

  router.use(authenticate);

  router.get("/", parsePagination, ctrl.listUsage);
  router.post("/", ctrl.createUsageRecord);
  router.get("/summary", ctrl.getUsageSummary);
  router.get("/:id", ctrl.getUsageRecord);
}
