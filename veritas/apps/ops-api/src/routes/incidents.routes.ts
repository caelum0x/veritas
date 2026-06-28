// Express router for /incidents endpoints — CRUD, timeline, postmortem, and status transitions.
import { Router } from "express";
import type { IncidentsController } from "../controllers/incidents.controller.js";

export function makeIncidentsRouter(ctrl: IncidentsController): Router {
  const router = Router();

  router.get("/", (req, res, next) => ctrl.list(req, res, next));
  router.post("/", (req, res, next) => ctrl.create(req, res, next));
  router.get("/:id", (req, res, next) => ctrl.get(req, res, next));
  router.patch("/:id", (req, res, next) => ctrl.update(req, res, next));

  router.post("/:id/status", (req, res, next) => ctrl.transition(req, res, next));

  router.get("/:id/timeline", (req, res, next) => ctrl.listTimeline(req, res, next));
  router.post("/:id/timeline", (req, res, next) => ctrl.addTimeline(req, res, next));

  router.get("/:id/postmortem", (req, res, next) => ctrl.getPostmortem(req, res, next));
  router.post("/:id/postmortem", (req, res, next) => ctrl.createPostmortem(req, res, next));

  router.get("/:id/metrics", (req, res, next) => ctrl.getMetrics(req, res, next));

  return router;
}
