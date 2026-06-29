// Maps AgentOutput domain objects to HTTP response shapes.
import type { AgentOutput, AgentListOutput } from "@veritas/services";

/** HTTP response shape for a single agent. */
export interface AgentResponse {
  readonly id: string;
  readonly name: string;
  readonly walletAddress: string;
  readonly endpoint: string | null;
  readonly publicKey: string | null;
  readonly trusted: boolean;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** HTTP response shape for a paginated list of agents. */
export interface AgentListResponse {
  readonly items: readonly AgentResponse[];
  readonly nextCursor: string | null;
  readonly total: number;
}

/** Convert a domain AgentOutput to an HTTP-safe AgentResponse. */
export function toAgentResponse(agent: AgentOutput): AgentResponse {
  return {
    id: agent.id,
    name: agent.name,
    walletAddress: agent.walletAddress,
    endpoint: agent.endpoint ?? null,
    publicKey: agent.publicKey ?? null,
    trusted: agent.trusted,
    metadata: agent.metadata,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
}

/** Convert an AgentListOutput to an HTTP-safe AgentListResponse. */
export function toAgentListResponse(list: AgentListOutput): AgentListResponse {
  return {
    items: list.items.map(toAgentResponse),
    nextCursor: list.nextCursor ?? null,
    total: list.total,
  };
}
