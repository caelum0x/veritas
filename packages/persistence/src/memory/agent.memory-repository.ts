// In-memory implementation of AgentRepository using MemoryStore.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { NotFoundError, ConflictError } from "@veritas/core";
import type { Page, PageRequest } from "@veritas/core";
import type { Agent, CreateAgent, UpdateAgent } from "@veritas/contracts";
import { MemoryStore } from "./memory-store.js";
import type { AgentRepository, AgentFilters } from "../repositories/agent.repository.js";
import { RepositoryNotFoundError, RepositoryConflictError } from "../errors.js";
import { paginateArray } from "../pagination.js";
import {
  toAgentRow,
  toAgentDomain,
  mergeAgentRow,
  type AgentRow,
} from "../mappers/agent.mapper.js";

/** In-memory AgentRepository: suitable for testing and development. */
export class MemoryAgentRepository implements AgentRepository {
  private readonly store = new MemoryStore<AgentRow & { id: string }>();

  async findById(id: string): Promise<Result<Agent, NotFoundError>> {
    const row = this.store.get(id);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("Agent", id));
    }
    return ok(toAgentDomain(row));
  }

  async findByWalletAddress(walletAddress: string): Promise<Result<Agent, NotFoundError>> {
    const row = this.store.all().find((r) => r.walletAddress === walletAddress);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("Agent", `walletAddress:${walletAddress}`));
    }
    return ok(toAgentDomain(row));
  }

  async list(filters: AgentFilters, page: PageRequest): Promise<Page<Agent>> {
    let rows = this.store.all();

    if (filters.trusted !== undefined) {
      rows = rows.filter((r) => r.trusted === filters.trusted);
    }
    if (filters.walletAddress !== undefined) {
      rows = rows.filter((r) => r.walletAddress === filters.walletAddress);
    }

    rows = rows.sort((a, b) => a.createdAt - b.createdAt);

    const agents = rows.map(toAgentDomain);
    return paginateArray(agents, page);
  }

  async create(data: CreateAgent): Promise<Result<Agent, ConflictError>> {
    const existing = this.store.all().find((r) => r.walletAddress === data.walletAddress);
    if (existing !== undefined) {
      return err(
        new RepositoryConflictError("Agent", `walletAddress already registered: ${data.walletAddress}`)
      );
    }

    const row = toAgentRow(data);
    this.store.set(row);
    return ok(toAgentDomain(row));
  }

  async update(id: string, data: UpdateAgent): Promise<Result<Agent, NotFoundError>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Agent", id));
    }

    const updated = mergeAgentRow(existing, data);
    this.store.set(updated);
    return ok(toAgentDomain(updated));
  }

  async delete(id: string): Promise<Result<void, NotFoundError>> {
    if (!this.store.has(id)) {
      return err(new RepositoryNotFoundError("Agent", id));
    }
    this.store.delete(id);
    return ok(undefined);
  }
}
