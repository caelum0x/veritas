// Maps between builder AgentCard types and HTTP response shapes for agent-card feature.

import type { BuilderAgentCard } from "@veritas/agent-card";
import type { AgentCard } from "@veritas/agent-card";
import type { PublishReceipt } from "@veritas/agent-card";

/** Wire DTO for the agent card discovery response. */
export interface AgentCardDiscoveryDto {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly protocolVersion: string;
  readonly maturity: string;
  readonly runtime: string;
  readonly url?: string;
  readonly endpointCount: number;
  readonly updatedAt?: string;
}

/** Map a builder AgentCard to a discovery summary DTO. */
export function toDiscoveryDto(
  card: BuilderAgentCard
): AgentCardDiscoveryDto {
  return {
    id: card.id,
    name: card.name,
    description: card.description,
    version: card.version,
    protocolVersion: card.protocolVersion,
    maturity: card.maturity,
    runtime: card.runtime,
    url: card.url,
    endpointCount: card.endpoints.length,
    updatedAt: card.updatedAt,
  };
}

/** Map a registry AgentCard to a discovery summary DTO. */
export function registryCardToDiscoveryDto(
  card: AgentCard
): AgentCardDiscoveryDto {
  return {
    id: card.id,
    name: card.name,
    description: card.description,
    version: card.version,
    protocolVersion: "1.0",
    maturity: card.status,
    runtime: "cloud",
    url: card.url,
    endpointCount: card.endpoints.length,
    updatedAt: card.updatedAt,
  };
}

/** Map a publish receipt into an HTTP response body. */
export function publishReceiptToDto(
  receipt: PublishReceipt
): Record<string, unknown> {
  return {
    agentId: receipt.agentId,
    registryUrl: receipt.registryUrl,
    kind: receipt.kind,
    publishedAt: receipt.publishedAt,
    cardUrl: receipt.cardUrl,
  };
}
