// v1 Health routes: unauthenticated liveness and readiness probes.
import { Router } from "express";
import { livenessHandler, readinessHandler } from "./health.controller.js";

/** Create and return the health router (no auth required). */
export function healthRouter(): Router {
  const router = Router();

  /** GET /v1/health — liveness probe */
  router.get("/", livenessHandler);

  /** GET /v1/health/ready — readiness probe */
  router.get("/ready", readinessHandler);

  return router;
}
