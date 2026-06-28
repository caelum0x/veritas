// DSR routes: registers all DSR endpoints on the provided router with auth guard.

import type { Router } from "express";
import type { DsrServiceDeps } from "./dsr.service.js";
import { requireAuth } from "../../middleware/auth.js";
import { DsrService } from "./dsr.service.js";
import { DsrController } from "./dsr.controller.js";

export function registerDsrRoutes(router: Router, deps: DsrServiceDeps): void {
  const service = new DsrService(deps);
  const ctrl = new DsrController(service);

  // POST /dsrs/verify/initiate — send OTP for identity verification (before generic :id routes)
  router.post("/dsrs/verify/initiate", requireAuth, (req, res, next) => ctrl.initiateVerification(req, res, next));

  // POST /dsrs/fulfill — full DSR fulfillment flow with identity verification
  router.post("/dsrs/fulfill", requireAuth, (req, res, next) => ctrl.fulfill(req, res, next));

  // POST /dsrs/erasure — run erasure flow for an existing erasure DSR
  router.post("/dsrs/erasure", requireAuth, (req, res, next) => ctrl.runErasure(req, res, next));

  // POST /dsrs — create a new data subject request
  router.post("/dsrs", requireAuth, (req, res, next) => ctrl.create(req, res, next));

  // GET /dsrs — list DSRs for a data subject (?subjectId=...)
  router.get("/dsrs", requireAuth, (req, res, next) => ctrl.listBySubject(req, res, next));

  // GET /dsrs/:id/workflow — get workflow state (before :id to avoid ambiguity)
  router.get("/dsrs/:id/workflow", requireAuth, (req, res, next) => ctrl.getWorkflow(req, res, next));

  // GET /dsrs/:id — fetch a single DSR
  router.get("/dsrs/:id", requireAuth, (req, res, next) => ctrl.get(req, res, next));

  // PATCH /dsrs/:id/status — transition DSR status
  router.patch("/dsrs/:id/status", requireAuth, (req, res, next) => ctrl.updateStatus(req, res, next));
}
