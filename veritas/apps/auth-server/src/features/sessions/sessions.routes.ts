// Sessions routes — mounts create, verify, list, revoke, and revoke-all session endpoints.

import { Router } from "express";
import type { Deps } from "../../container.js";
import { SessionsService } from "./sessions.service.js";
import { SessionsController } from "./sessions.controller.js";

export function registerSessionsRoutes(router: Router, deps: Deps): void {
  const service = new SessionsService({
    tokenService: deps.tokenService,
    logger: deps.logger,
    tokenSecret: deps.config.tokenSecret,
    tokenTtlSeconds: deps.config.tokenTtlSeconds,
  });
  const controller = new SessionsController(service);

  // Create a new session and issue a token
  router.post("/sessions", controller.create);

  // Verify a session token and return its payload
  router.post("/sessions/verify", controller.verify);

  // List all sessions for a user
  router.get("/sessions", controller.list);

  // Revoke all sessions for a user
  router.delete("/sessions", controller.revokeAll);

  // Revoke a specific session by ID
  router.delete("/sessions/:sessionId", controller.revoke);
}
