// Registers status and SLO routes on the provided Express router.
import type { Router } from "express";
import type { StatusService } from "../../status-service.js";
import type { SloRepository } from "@veritas/slo";
import type { Logger } from "@veritas/observability";
import type { StatusServiceDeps } from "./status.service.js";
import {
  handleGetStatus,
  handleListSlos,
  handleGetSlo,
  handleGetSloEvaluations,
} from "./status.controller.js";

/** Minimal Deps shape required by the status feature. */
export interface StatusDeps {
  readonly statusService: StatusService;
  readonly sloRepository: SloRepository;
  readonly logger: Logger;
}

/** Mount status and SLO endpoints on the router. */
export function registerStatusRoutes(router: Router, deps: StatusDeps): void {
  const serviceDeps: StatusServiceDeps = {
    statusService: deps.statusService,
    sloRepository: deps.sloRepository,
    logger: deps.logger,
  };

  router.get("/status", (req, res, next) =>
    handleGetStatus(serviceDeps, req, res, next),
  );

  router.get("/slos", (req, res, next) =>
    handleListSlos(serviceDeps, req, res, next),
  );

  router.get("/slos/:id", (req, res, next) =>
    handleGetSlo(serviceDeps, req, res, next),
  );

  router.get("/slos/:id/evaluations", (req, res, next) =>
    handleGetSloEvaluations(serviceDeps, req, res, next),
  );
}
