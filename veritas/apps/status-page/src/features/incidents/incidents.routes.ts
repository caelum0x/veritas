// Registers incidents routes on the provided Express router.
import type { Router } from "express";
import type { Deps } from "../../container.js";
import type { IncidentsDeps } from "./incidents.service.js";
import {
  handleCreateIncident,
  handleListIncidents,
  handleGetIncident,
  handleUpdateIncident,
  handleTransitionStatus,
  handleAssignResponder,
  handleRemoveResponder,
  handleAddTimelineEntry,
  handleGetTimeline,
  handleCreatePostmortem,
  handleGetPostmortem,
  handleUpdatePostmortem,
  handleGetMetrics,
  handleGetSloMetrics,
} from "./incidents.controller.js";

/** Mount incidents endpoints on the router. */
export function registerIncidentsRoutes(router: Router, deps: Deps): void {
  const incidentDeps: IncidentsDeps = {
    incidentService: deps.incidentService,
    logger: deps.logger,
  };

  router.get("/incidents/metrics", (req, res, next) =>
    handleGetMetrics(incidentDeps, req, res, next),
  );

  router.get("/incidents/slo-metrics", (req, res, next) =>
    handleGetSloMetrics(incidentDeps, req, res, next),
  );

  router.get("/incidents", (req, res, next) =>
    handleListIncidents(incidentDeps, req, res, next),
  );

  router.post("/incidents", (req, res, next) =>
    handleCreateIncident(incidentDeps, req, res, next),
  );

  router.get("/incidents/:id", (req, res, next) =>
    handleGetIncident(incidentDeps, req, res, next),
  );

  router.patch("/incidents/:id", (req, res, next) =>
    handleUpdateIncident(incidentDeps, req, res, next),
  );

  router.post("/incidents/:id/transition", (req, res, next) =>
    handleTransitionStatus(incidentDeps, req, res, next),
  );

  router.post("/incidents/:id/responders", (req, res, next) =>
    handleAssignResponder(incidentDeps, req, res, next),
  );

  router.delete("/incidents/:id/responders/:responderId", (req, res, next) =>
    handleRemoveResponder(incidentDeps, req, res, next),
  );

  router.post("/incidents/:id/timeline", (req, res, next) =>
    handleAddTimelineEntry(incidentDeps, req, res, next),
  );

  router.get("/incidents/:id/timeline", (req, res, next) =>
    handleGetTimeline(incidentDeps, req, res, next),
  );

  router.post("/incidents/:id/postmortem", (req, res, next) =>
    handleCreatePostmortem(incidentDeps, req, res, next),
  );

  router.get("/incidents/:id/postmortem", (req, res, next) =>
    handleGetPostmortem(incidentDeps, req, res, next),
  );

  router.patch("/incidents/:id/postmortem", (req, res, next) =>
    handleUpdatePostmortem(incidentDeps, req, res, next),
  );
}
