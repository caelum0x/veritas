// Discovery endpoint: serves the A2A agent card for registry crawlers and peers.

import type { Router, Request, Response } from "express";
import { Router as createRouter } from "express";
import type { Logger } from "@veritas/observability";
import type { AgentCard } from "@veritas/agent-card";

export interface DiscoveryEndpointOptions {
  readonly card: AgentCard;
  readonly logger?: Logger;
}

/**
 * Mount GET /.well-known/agent.json and GET /agent-card — returns the agent card
 * as JSON for discovery by registry crawlers and peer agents.
 */
export function createDiscoveryEndpoint(opts: DiscoveryEndpointOptions): Router {
  const router = createRouter();
  const { card, logger } = opts;
  const serialised = JSON.stringify(card);

  function handleCard(_req: Request, res: Response): void {
    logger?.debug("Serving agent card");
    res
      .status(200)
      .setHeader("Content-Type", "application/json")
      .setHeader("Cache-Control", "public, max-age=300")
      .send(serialised);
  }

  router.get("/.well-known/agent.json", handleCard);
  router.get("/agent-card", handleCard);

  return router;
}

/** Alias for use in Express app wiring — same as createDiscoveryEndpoint. */
export function discoveryEndpoint(card: AgentCard): Router {
  return createDiscoveryEndpoint({ card });
}
