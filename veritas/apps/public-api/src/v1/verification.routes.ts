// Express router for v1 verification endpoints — wires middleware + controller.
import { Router } from "express";
import type { VerificationController } from "./verification.controller.js";

/** Mount verification routes onto a new Express Router. */
export function makeVerificationRouter(ctrl: VerificationController): Router {
  const router = Router({ mergeParams: true });

  /** POST /verifications — submit a new verification job */
  router.post("/", ctrl.submit);

  /** GET /verifications — list jobs with optional status filter */
  router.get("/", ctrl.list);

  /** GET /verifications/:jobId — get job by ID */
  router.get("/:jobId", ctrl.get);

  /** DELETE /verifications/:jobId — cancel job */
  router.delete("/:jobId", ctrl.cancel);

  return router;
}
