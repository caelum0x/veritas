// A2A feature routes: mounts A2A task and CAP bridge endpoints on the given router.

import { type Router } from "express";
import type { Logger } from "@veritas/observability";
import type { EngineOptions } from "@veritas/verification";
import type { CapBridgeConfig } from "@veritas/a2a-protocol";
import { createA2AService } from "./a2a.service.js";
import { createA2AController } from "./a2a.controller.js";

/** Minimal deps slice required by the A2A feature. */
export interface A2ADeps {
  readonly logger: Logger;
  readonly engineOptions: EngineOptions;
  readonly capBridgeConfig: CapBridgeConfig;
}

/**
 * Mount all A2A task and CAP bridge routes onto the provided router.
 * Called by the central router with a shared Deps object.
 */
export function registerA2aRoutes(router: Router, deps: A2ADeps): void {
  const service = createA2AService({
    logger: deps.logger,
    engineOptions: deps.engineOptions,
    capBridgeConfig: deps.capBridgeConfig,
  });

  const controller = createA2AController({
    service,
    logger: deps.logger,
  });

  /** POST /a2a/tasks — submit a verification task via A2A protocol. */
  router.post("/a2a/tasks", controller.submitTask);

  /** GET /a2a/tasks/:taskId — retrieve task status (stateless: always 404). */
  router.get("/a2a/tasks/:taskId", controller.getTask);

  /** POST /a2a/cap/negotiate — bridge A2A request into a CAP negotiation. */
  router.post("/a2a/cap/negotiate", controller.negotiateCap);

  /** POST /a2a/cap/deliver — receive a completed CAP delivery payload. */
  router.post("/a2a/cap/deliver", controller.receiveCapDelivery);
}
