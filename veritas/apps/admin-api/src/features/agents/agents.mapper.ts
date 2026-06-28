// Maps AgentOutput domain objects to HTTP response shapes.
import type { AgentOutput, AgentListOutput } from "@veritas/services";

export interface AgentResponse {
  readonly id: string;
  readonly name: string;
  readonly walletAddress: string;
  readonly endpoint: string | null;
  readonly publicKey: string | null;
  readonly trusted: boolean;
  readonly metadata: Record<string, unknown> | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AgentListResponse {
  readonly items: readonly AgentResponse[];
  readonly nextCursor: string | null;
  readonly total: number;
}

export function toAgentResponse(output: AgentOutput): AgentResponse {
  return {
    id: output.id,
    name: output.name,
    walletAddress: output.walletAddress,
    endpoint: output.endpoint ?? null,
    publicKey: output.publicKey ?? null,
    trusted: output.trusted,
    metadata: output.metadata as Record<string, unknown> | undefined,
    createdAt: String(output.createdAt),
    updatedAt: String(output.updatedAt),
  };
}

export function toAgentListResponse(output: AgentListOutput): AgentListResponse {
  return {
    items: output.items.map(toAgentResponse),
    nextCursor: output.nextCursor,
    total: output.total,
  };
}
