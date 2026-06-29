// Express router for /slos endpoints — CRUD, evaluations, and burn-rate alert queries.
import { Router } from "express";
import type { SloController } from "../controllers/slo.controller.js";

export function makeSloRouter(ctrl: SloController): Router {
  const router = Router();

  router.get("/", (req, res, next) => ctrl.list(req, res, next));
  router.post("/", (req, res, next) => ctrl.create(req, res, next));
  router.get("/:id", (req, res, next) => ctrl.get(req, res, next));
  router.patch("/:id", (req, res, next) => ctrl.update(req, res, next));
  router.delete("/:id", (req, res, next) => ctrl.remove(req, res, next));

  router.get("/:id/evaluations", (req, res, next) => ctrl.listEvaluations(req, res, next));
  router.get("/:id/evaluations/:evalId", (req, res, next) => ctrl.getEvaluation(req, res, next));

  return router;
}
