// On-chain agent registry port: interface for registering and querying CAP agents

import type { Result } from "@veritas/core";
import type { EvmAddress } from "@veritas/blockchain";
import type { RegistryRecord, AgentMetadata } from "./record.js";

/** Parameters to register a new agent on-chain */
export interface RegisterAgentParams {
  readonly owner: EvmAddress;
  readonly metadataUri: string;
  readonly metadata: AgentMetadata;
}

/** Parameters to update an existing agent's on-chain record */
export interface UpdateAgentParams {
  readonly id: string;
  readonly metadataUri: string;
  readonly metadata: AgentMetadata;
  readonly caller: EvmAddress;
}

/** Parameters to change an agent's status on-chain */
export interface SetAgentStatusParams {
  readonly id: string;
  readonly status: "active" | "suspended" | "deregistered";
  readonly caller: EvmAddress;
}

/** Query filters for listing agents from the registry */
export interface AgentRegistryFilter {
  readonly owner?: EvmAddress;
  readonly status?: "active" | "suspended" | "deregistered";
  readonly limit?: number;
  readonly afterId?: string;
}

/** Port interface for the on-chain agent registry */
export interface AgentRegistryPort {
  /** Register a new agent, returning the new registry record */
  register(params: RegisterAgentParams): Promise<Result<RegistryRecord>>;

  /** Update an existing agent's metadata */
  update(params: UpdateAgentParams): Promise<Result<RegistryRecord>>;

  /** Change the agent's registry status */
  setStatus(params: SetAgentStatusParams): Promise<Result<RegistryRecord>>;

  /** Resolve a single agent record by id */
  getById(id: string): Promise<Result<RegistryRecord>>;

  /** Resolve a single agent record by owner wallet address */
  getByOwner(owner: EvmAddress): Promise<Result<RegistryRecord | null>>;

  /** List agents with optional filtering */
  list(filter?: AgentRegistryFilter): Promise<Result<readonly RegistryRecord[]>>;
}
