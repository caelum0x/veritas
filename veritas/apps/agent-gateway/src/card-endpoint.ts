// Serve the Veritas agent card at GET /v1/agent-card for programmatic access.

import { Router, type Request, type Response } from "express";
import type { AgentCard } from "@veritas/agent-card";

/** Mount the agent card REST endpoint on a new Router. */
export function createCardEndpoint(card: AgentCard): Router {
  const router = Router();
  const serialised = JSON.stringify(card);

  router.get("/v1/agent-card", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(serialised);
  });

  return router;
}
