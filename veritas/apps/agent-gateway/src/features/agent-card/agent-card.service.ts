// AgentCardService: builds, serves, and publishes the Veritas agent card.

import { ok, err, isOk, type Result } from "@veritas/core";
import {
  agentCardBuilder,
  type BuilderAgentCard,
  publishCard,
  fetchCardRegistry,
  CardValidationError,
  makeAgentCard,
  parseAgentCard,
  type AgentCard,
} from "@veritas/agent-card";
import type { PublishReceipt } from "@veritas/agent-card";
import type { Logger } from "@veritas/observability";
import type { PublishCardRequest } from "./agent-card.schema.js";
import {
  toDiscoveryDto,
  type AgentCardDiscoveryDto,
  publishReceiptToDto,
} from "./agent-card.mapper.js";

/** Configuration describing this Veritas instance as an agent. */
export interface AgentCardConfig {
  readonly agentId: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly publicUrl: string;
  readonly contactEmail?: string;
}

/** Deps required by the AgentCardService. */
export interface AgentCardServiceDeps {
  readonly logger: Logger;
  readonly agentCardConfig: AgentCardConfig;
  /** Pre-built registry card served at GET /v1/agent-card. */
  readonly registryCard: AgentCard;
}

/** Service for managing the Veritas agent card lifecycle. */
export class AgentCardService {
  private readonly logger: Logger;
  private readonly agentCardConfig: AgentCardConfig;
  private readonly registryCard: AgentCard;
  private cachedBuilderCard: BuilderAgentCard | null = null;

  constructor(deps: AgentCardServiceDeps) {
    this.logger = deps.logger;
    this.agentCardConfig = deps.agentCardConfig;
    this.registryCard = deps.registryCard;
  }

  /** Return the pre-built registry-format agent card. */
  getRegistryCard(): AgentCard {
    return this.registryCard;
  }

  /**
   * Build a builder-format AgentCard describing the Veritas verification agent.
   * Result is memoized after first construction.
   */
  buildCard(): Result<BuilderAgentCard, CardValidationError> {
    if (this.cachedBuilderCard !== null) {
      return ok(this.cachedBuilderCard);
    }

    const { agentId, name, description, version, publicUrl, contactEmail } =
      this.agentCardConfig;

    const result = agentCardBuilder()
      .withId(agentId)
      .withName(name)
      .withDescription(description)
      .withVersion(version)
      .withProtocolVersion("1.0")
      .withMaturity("stable")
      .withRuntime("cloud")
      .withUrl(publicUrl)
      .withContact(
        contactEmail
          ? { name: "Veritas Team", email: contactEmail }
          : { name: "Veritas Team" }
      )
      .withDefaultAuth({ type: "apiKey", in: "header", name: "X-Api-Key" })
      .addEndpoint({
        name: "a2a",
        url: `${publicUrl}/a2a`,
        protocol: "https",
        auth: { type: "apiKey", in: "header", name: "X-Api-Key" },
        description: "A2A task submission endpoint",
      })
      .addEndpoint({
        name: "agent-card",
        url: `${publicUrl}/v1/agent-card`,
        protocol: "https",
        auth: { type: "none" },
        description: "Agent card discovery endpoint",
      })
      .addEndpoint({
        name: "health",
        url: `${publicUrl}/health`,
        protocol: "https",
        auth: { type: "none" },
        description: "Health check endpoint",
      })
      .build();

    if (isOk(result)) {
      this.cachedBuilderCard = result.value;
    }
    return result;
  }

  /** Return a discovery summary DTO for the agent card. */
  getDiscoveryDto(): Result<AgentCardDiscoveryDto, CardValidationError> {
    const cardResult = this.buildCard();
    if (!isOk(cardResult)) {
      return err(cardResult.error);
    }
    return ok(toDiscoveryDto(cardResult.value));
  }

  /**
   * Publish the built agent card to an external registry.
   * Uses the @veritas/agent-card publishCard function with retry.
   */
  async publishToRegistry(
    request: PublishCardRequest
  ): Promise<Result<ReturnType<typeof publishReceiptToDto>>> {
    const cardResult = this.buildCard();
    if (!isOk(cardResult)) {
      return err(cardResult.error);
    }

    // publishCard expects a builder AgentCard type
    const receipt = await publishCard(
      cardResult.value,
      {
        kind: request.kind,
        registryUrl: request.registryUrl,
        authToken: request.authToken,
      },
      fetchCardRegistry
    );

    if (!isOk(receipt)) {
      this.logger.error("agent-card-service: publish failed", {
        registryUrl: request.registryUrl,
        err: receipt.error,
      });
      return err(receipt.error as CardValidationError);
    }

    this.logger.info("agent-card-service: card published", {
      agentId: receipt.value.agentId,
      registryUrl: receipt.value.registryUrl,
      kind: receipt.value.kind,
    });

    return ok(publishReceiptToDto(receipt.value));
  }
}

/** Factory function — instantiates AgentCardService from deps. */
export function createAgentCardService(
  deps: AgentCardServiceDeps
): AgentCardService {
  return new AgentCardService(deps);
}
