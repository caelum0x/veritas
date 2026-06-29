// In-memory NegotiationRepository implementation backed by MemoryStore.
import { ok, err, systemClock, epochToIso, type Result, type Page } from "@veritas/core";
import type { Negotiation, CreateNegotiation, UpdateNegotiation } from "@veritas/contracts";
import { MemoryStore } from "./memory-store.js";
import { RepositoryNotFoundError } from "../errors.js";
import { paginateArray } from "../pagination.js";
import { evalFilter, applySort, type QueryOptions } from "../query.js";
import type { NegotiationRepository } from "../repositories/negotiation.repository.js";
import { createDtoToNegotiation } from "../mappers/negotiation.mapper.js";

/** In-memory implementation of NegotiationRepository. */
export class NegotiationMemoryRepository implements NegotiationRepository {
  private readonly store = new MemoryStore<Negotiation & { id: string }>();
  private readonly clock = systemClock;

  async findById(id: string): Promise<Result<Negotiation>> {
    const item = this.store.get(id);
    if (item === undefined) {
      return err(new RepositoryNotFoundError("Negotiation", id));
    }
    return ok(item);
  }

  async list(options?: QueryOptions<Negotiation>): Promise<Result<Page<Negotiation>>> {
    let rows = this.store.all();
    if (options?.filter !== undefined) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }
    if (options?.sort !== undefined && options.sort.length > 0) {
      rows = applySort(rows, options.sort);
    }
    return ok(paginateArray(rows, options?.page));
  }

  async create(dto: CreateNegotiation): Promise<Result<Negotiation>> {
    const now = epochToIso(this.clock.now());
    const negotiation = createDtoToNegotiation(dto, now);
    const saved = this.store.set(negotiation);
    return ok(saved);
  }

  async update(id: string, dto: UpdateNegotiation): Promise<Result<Negotiation>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Negotiation", id));
    }
    const updated: Negotiation = {
      ...existing,
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      updatedAt: epochToIso(this.clock.now()),
    };
    const saved = this.store.set(updated);
    return ok(saved);
  }

  async delete(id: string): Promise<Result<Negotiation>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Negotiation", id));
    }
    this.store.delete(id);
    return ok(existing);
  }

  async findByBuyerAgentId(buyerAgentId: string, options?: QueryOptions<Negotiation>): Promise<Result<Page<Negotiation>>> {
    return this.list({
      ...options,
      filter: { and: [{ field: "buyerAgentId", operator: "eq", value: buyerAgentId }, ...(options?.filter?.and ?? [])] },
    });
  }

  async findByServiceId(serviceId: string, options?: QueryOptions<Negotiation>): Promise<Result<Page<Negotiation>>> {
    return this.list({
      ...options,
      filter: { and: [{ field: "serviceId", operator: "eq", value: serviceId }, ...(options?.filter?.and ?? [])] },
    });
  }

  async findByStatus(status: string, options?: QueryOptions<Negotiation>): Promise<Result<Page<Negotiation>>> {
    return this.list({
      ...options,
      filter: { and: [{ field: "status", operator: "eq", value: status }, ...(options?.filter?.and ?? [])] },
    });
  }

  async expireQuoted(beforeIso: string): Promise<Result<number>> {
    const rows = this.store.all().filter(
      (r) => r.status === "QUOTED" && r.expiresAt < beforeIso,
    );
    const now = epochToIso(this.clock.now());
    for (const row of rows) {
      const updated: Negotiation = { ...row, status: "EXPIRED", updatedAt: now };
      this.store.set(updated);
    }
    return ok(rows.length);
  }
}
