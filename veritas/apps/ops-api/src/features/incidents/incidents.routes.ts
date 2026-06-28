// Registers all /incidents routes on the provided Express router using the Deps container.
import { Router } from "express";
import { IncidentService } from "@veritas/incident";
import { IncidentsFeatureService } from "./incidents.service.js";
import { IncidentsController } from "./incidents.controller.js";

/** Minimal slice of Deps consumed by the incidents feature. */
export interface IncidentsDeps {
  readonly incidentService: IncidentService;
}

export function registerIncidentsRoutes(router: Router, deps: IncidentsDeps): void {
  const service = new IncidentsFeatureService({ incidentService: deps.incidentService });
  const ctrl = new IncidentsController(service);

  router.get("/", (req, res, next) => ctrl.list(req, res, next));
  router.post("/", (req, res, next) => ctrl.create(req, res, next));
  router.get("/metrics", (req, res, next) => ctrl.getMetrics(req, res, next));
  router.get("/metrics/slo", (req, res, next) => ctrl.getSloMetrics(req, res, next));
  router.get("/:id", (req, res, next) => ctrl.get(req, res, next));
  router.patch("/:id", (req, res, next) => ctrl.update(req, res, next));

  router.post("/:id/status", (req, res, next) => ctrl.transition(req, res, next));

  router.get("/:id/timeline", (req, res, next) => ctrl.listTimeline(req, res, next));
  router.post("/:id/timeline", (req, res, next) => ctrl.addTimelineEntry(req, res, next));

  router.post(
    "/:id/responders/:responderId",
    (req, res, next) => ctrl.assignResponder(req, res, next),
  );
  router.delete(
    "/:id/responders/:responderId",
    (req, res, next) => ctrl.removeResponder(req, res, next),
  );

  router.get("/:id/postmortem", (req, res, next) => ctrl.getPostmortem(req, res, next));
  router.post("/:id/postmortem", (req, res, next) => ctrl.createPostmortem(req, res, next));
}
