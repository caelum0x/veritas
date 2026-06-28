// Health route definitions: liveness and readiness probes, no authentication required.
import { Router } from "express";
import type { Container } from "@veritas/container";
import type { AppConfig } from "@veritas/config";
import { buildHealthHandlers } from "../controllers/health.controller.js";

export function healthRouter(container: Container, config: AppConfig): Router {
  const router = Router();
  const { liveness, readiness } = buildHealthHandlers(container, config);

  router.get("/live", liveness);
  router.get("/ready", readiness);
  router.get("/", readiness);

  return router;
}
