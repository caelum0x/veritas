// Maps Agent domain objects to/from persistence row representation.

import type { Agent, CreateAgent, UpdateAgent } from "@veritas/contracts";
import { newId, epochToIso, isoToEpoch } from "@veritas/core";

/** Persistence row shape for Agent. */
export interface AgentRow {
  readonly id: string;
  readonly name: string;
  readonly walletAddress: string;
  readonly endpoint: string | null;
  readonly publicKey: string | null;
  readonly trusted: boolean;
  readonly metadata: Record<string, unknown> | undefined;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** Map a persistence row to an Agent domain object. */
export function toAgentDomain(row: AgentRow): Agent {
  return {
    id: row.id as Agent["id"],
    name: row.name,
    walletAddress: row.walletAddress,
    endpoint: row.endpoint,
    publicKey: row.publicKey,
    trusted: row.trusted,
    metadata: row.metadata,
    createdAt: epochToIso(row.createdAt),
    updatedAt: epochToIso(row.updatedAt),
  };
}

/** Map CreateAgent DTO to an AgentRow ready for storage. */
export function toAgentRow(dto: CreateAgent): AgentRow {
  const now = Date.now();
  return {
    id: newId("agent"),
    name: dto.name,
    walletAddress: dto.walletAddress,
    endpoint: dto.endpoint ?? null,
    publicKey: dto.publicKey ?? null,
    trusted: false,
    metadata: dto.metadata,
    createdAt: now,
    updatedAt: now,
  };
}

/** Merge an UpdateAgent DTO into an existing AgentRow, returning a new row. */
export function mergeAgentRow(existing: AgentRow, dto: UpdateAgent): AgentRow {
  return {
    ...existing,
    name: dto.name ?? existing.name,
    endpoint: dto.endpoint !== undefined ? dto.endpoint : existing.endpoint,
    publicKey: dto.publicKey !== undefined ? dto.publicKey : existing.publicKey,
    trusted: dto.trusted ?? existing.trusted,
    metadata: dto.metadata ?? existing.metadata,
    updatedAt: Date.now(),
  };
}

/** Map an Agent domain object back to a persistence row. */
export function fromAgentDomain(agent: Agent): AgentRow {
  return {
    id: agent.id,
    name: agent.name,
    walletAddress: agent.walletAddress,
    endpoint: agent.endpoint,
    publicKey: agent.publicKey,
    trusted: agent.trusted,
    metadata: agent.metadata,
    createdAt: isoToEpoch(agent.createdAt) ?? 0,
    updatedAt: isoToEpoch(agent.updatedAt) ?? 0,
  };
}
