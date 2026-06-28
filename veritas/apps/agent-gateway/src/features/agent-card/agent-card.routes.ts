// Agent-card feature routes: mounts card serving, discovery, and publish endpoints.

import type { Router } from "express";
import type { Logger } from "@veritas/observability";
import type { AgentCard } from "@veritas/agent-card";
import { createAgentCardService, type AgentCardConfig } from "./agent-card.service.js";
import { createAgentCardController } from "./agent-card.controller.js";

/** Minimal deps slice required by the agent-card feature. */
export interface AgentCardDeps {
  readonly logger: Logger;
  readonly agentCardConfig: AgentCardConfig;
  /** Pre-built registry-format card passed in from bootstrap. */
  readonly registryCard: AgentCard;
}

/**
 * Mount all agent-card routes onto the provided router.
 * Called by the central router with a shared Deps object.
 */
export function registerAgentCardRoutes(router: Router, deps: AgentCardDeps): void {
  const service = createAgentCardService({
    logger: deps.logger,
    agentCardConfig: deps.agentCardConfig,
    registryCard: deps.registryCard,
  });

  const controller = createAgentCardController({
    service,
    logger: deps.logger,
  });

  /** GET /v1/agent-card — full agent card for agent directories. */
  router.get("/v1/agent-card", controller.getCard);

  /** GET /v1/agent-card/builder — builder-format card for internal tooling. */
  router.get("/v1/agent-card/builder", controller.getBuilderCard);

  /** GET /v1/discovery — lightweight discovery summary for agent browsers. */
  router.get("/v1/discovery", controller.discover);

  /** POST /v1/agent-card/publish — push the card to an external registry. */
  router.post("/v1/agent-card/publish", controller.publish);
}
