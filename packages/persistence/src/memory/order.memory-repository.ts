// In-memory OrderRepository implementation backed by MemoryStore.
import { ok, err, systemClock, epochToIso, type Result, type Page } from "@veritas/core";
import type { Order, CreateOrder, UpdateOrder } from "@veritas/contracts";
import { MemoryStore } from "./memory-store.js";
import { RepositoryNotFoundError } from "../errors.js";
import { paginateArray } from "../pagination.js";
import { evalFilter, applySort, type QueryOptions } from "../query.js";
import type { OrderRepository } from "../repositories/order.repository.js";
import { createDtoToOrder } from "../mappers/order.mapper.js";

/** In-memory implementation of OrderRepository. */
export class OrderMemoryRepository implements OrderRepository {
  private readonly store = new MemoryStore<Order & { id: string }>();
  private readonly clock = systemClock;

  async findById(id: string): Promise<Result<Order>> {
    const item = this.store.get(id);
    if (item === undefined) {
      return err(new RepositoryNotFoundError("Order", id));
    }
    return ok(item);
  }

  async list(options?: QueryOptions<Order>): Promise<Result<Page<Order>>> {
    let rows = this.store.all();
    if (options?.filter !== undefined) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }
    if (options?.sort !== undefined && options.sort.length > 0) {
      rows = applySort(rows, options.sort);
    }
    return ok(paginateArray(rows, options?.page));
  }

  async create(dto: CreateOrder): Promise<Result<Order>> {
    const now = epochToIso(this.clock.now());
    const order = createDtoToOrder(dto, now);
    const saved = this.store.set(order);
    return ok(saved);
  }

  async update(id: string, dto: UpdateOrder): Promise<Result<Order>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Order", id));
    }
    const updated: Order = {
      ...existing,
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.jobId !== undefined ? { jobId: dto.jobId } : {}),
      ...(dto.settlementId !== undefined ? { settlementId: dto.settlementId } : {}),
      updatedAt: epochToIso(this.clock.now()),
    };
    const saved = this.store.set(updated);
    return ok(saved);
  }

  async delete(id: string): Promise<Result<Order>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Order", id));
    }
    this.store.delete(id);
    return ok(existing);
  }

  async findByBuyerAgentId(buyerAgentId: string, options?: QueryOptions<Order>): Promise<Result<Page<Order>>> {
    return this.list({
      ...options,
      filter: { and: [{ field: "buyerAgentId", operator: "eq", value: buyerAgentId }, ...(options?.filter?.and ?? [])] },
    });
  }

  async findByServiceId(serviceId: string, options?: QueryOptions<Order>): Promise<Result<Page<Order>>> {
    return this.list({
      ...options,
      filter: { and: [{ field: "serviceId", operator: "eq", value: serviceId }, ...(options?.filter?.and ?? [])] },
    });
  }

  async findByNegotiationId(negotiationId: string, options?: QueryOptions<Order>): Promise<Result<Page<Order>>> {
    return this.list({
      ...options,
      filter: { and: [{ field: "negotiationId", operator: "eq", value: negotiationId }, ...(options?.filter?.and ?? [])] },
    });
  }

  async findByJobId(jobId: string): Promise<Result<Order>> {
    const rows = this.store.all().filter((r) => r.jobId === jobId);
    if (rows.length === 0) {
      return err(new RepositoryNotFoundError("Order", jobId));
    }
    return ok(rows[0]!);
  }

  async findByStatus(status: string, options?: QueryOptions<Order>): Promise<Result<Page<Order>>> {
    return this.list({
      ...options,
      filter: { and: [{ field: "status", operator: "eq", value: status }, ...(options?.filter?.and ?? [])] },
    });
  }
}
