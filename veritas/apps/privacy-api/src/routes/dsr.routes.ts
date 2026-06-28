// DSR routes: mount CRUD and status-transition endpoints for data subject requests.

import { Router } from "express";
import { type DsrStore } from "@veritas/gdpr";
import { DsrController } from "../controllers/dsr.controller.js";
import { requireAuth } from "../middleware/auth.js";

export function buildDsrRouter(store: DsrStore): Router {
  const router = Router();
  const ctrl = new DsrController(store);

  // POST /dsrs — submit a new DSR
  router.post("/", requireAuth, (req, res, next) => ctrl.create(req, res, next));

  // GET /dsrs — list DSRs for a data subject (subjectId query param)
  router.get("/", requireAuth, (req, res, next) => ctrl.listBySubject(req, res, next));

  // GET /dsrs/:id — fetch a single DSR
  router.get("/:id", requireAuth, (req, res, next) => ctrl.get(req, res, next));

  // PATCH /dsrs/:id/status — transition DSR status
  router.patch("/:id/status", requireAuth, (req, res, next) => ctrl.updateStatus(req, res, next));

  // GET /dsrs/:id/workflow — get workflow state for a DSR
  router.get("/:id/workflow", requireAuth, (req, res, next) => ctrl.getWorkflow(req, res, next));

  return router;
}
