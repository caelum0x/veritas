// AgentRepository interface: read/write access to persisted CAP agent records.

import type { Result } from "@veritas/core";
import type { NotFoundError, ConflictError } from "@veritas/core";
import type { Page, PageRequest } from "@veritas/core";
import type { Agent, CreateAgent, UpdateAgent } from "@veritas/contracts";

/** Filter options for listing agents. */
export interface AgentFilters {
  /** Restrict to agents with a specific trusted flag. */
  readonly trusted?: boolean;
  /** Restrict to agents with a specific wallet address. */
  readonly walletAddress?: string;
}

/** Repository abstraction for Agent entities. */
export interface AgentRepository {
  /**
   * Find an agent by its id.
   * Returns Err(NotFoundError) if no such agent exists.
   */
  findById(id: string): Promise<Result<Agent, NotFoundError>>;

  /**
   * Find an agent by its wallet address.
   * Returns Err(NotFoundError) if no agent has that wallet address.
   */
  findByWalletAddress(walletAddress: string): Promise<Result<Agent, NotFoundError>>;

  /**
   * List agents with optional filters and cursor-based pagination.
   */
  list(filters: AgentFilters, page: PageRequest): Promise<Page<Agent>>;

  /**
   * Persist a new agent derived from CreateAgent data.
   * Returns Err(ConflictError) if an agent with the same walletAddress already exists.
   */
  create(data: CreateAgent): Promise<Result<Agent, ConflictError>>;

  /**
   * Apply a partial update to an existing agent.
   * Returns Err(NotFoundError) if the agent does not exist.
   */
  update(id: string, data: UpdateAgent): Promise<Result<Agent, NotFoundError>>;

  /**
   * Remove an agent by id.
   * Returns Err(NotFoundError) if the agent does not exist.
   */
  delete(id: string): Promise<Result<void, NotFoundError>>;
}
