// Registers all /slos routes on the provided Express router using the Deps container.
import { Router } from "express";
import type {
  SloRepository,
  SloEvaluationRepository,
  BurnAlertRepository,
  SloReportRepository,
} from "@veritas/slo";
import { SloFeatureService } from "./slo.service.js";
import { SloController } from "./slo.controller.js";

/** Minimal slice of Deps consumed by the SLO feature. */
export interface SloDeps {
  readonly sloRepo: SloRepository;
  readonly sloEvalRepo: SloEvaluationRepository;
  readonly burnAlertRepo: BurnAlertRepository;
  readonly sloReportRepo: SloReportRepository;
}

export function registerSloRoutes(router: Router, deps: SloDeps): void {
  const service = new SloFeatureService(deps);
  const ctrl = new SloController(service);

  router.get("/", (req, res, next) => ctrl.list(req, res, next));
  router.post("/", (req, res, next) => ctrl.create(req, res, next));
  router.get("/:id", (req, res, next) => ctrl.get(req, res, next));
  router.patch("/:id", (req, res, next) => ctrl.update(req, res, next));
  router.delete("/:id", (req, res, next) => ctrl.remove(req, res, next));

  router.post("/:id/evaluate", (req, res, next) => ctrl.evaluate(req, res, next));

  router.get("/:id/evaluations", (req, res, next) => ctrl.listEvaluations(req, res, next));
  router.get(
    "/:id/evaluations/:evalId",
    (req, res, next) => ctrl.getEvaluation(req, res, next),
  );

  router.get("/:id/alerts", (req, res, next) => ctrl.listBurnAlerts(req, res, next));

  router.post("/:id/reports", (req, res, next) => ctrl.generateReport(req, res, next));
  router.get("/:id/reports", (req, res, next) => ctrl.listReports(req, res, next));
  router.get(
    "/:id/reports/:reportId",
    (req, res, next) => ctrl.getReport(req, res, next),
  );
}
