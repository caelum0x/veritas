// In-memory SettlementRepository implementation backed by MemoryStore.
import { ok, err, systemClock, newId, type Result, type Page, type AppError } from "@veritas/core";
import type { Settlement, CreateSettlement, UpdateSettlement } from "@veritas/contracts";
import { MemoryStore } from "./memory-store.js";
import { RepositoryNotFoundError } from "../errors.js";
import { paginateArray } from "../pagination.js";
import { evalFilter, applySort, type QueryOptions } from "../query.js";
import type { SettlementRepository } from "../repositories/settlement.repository.js";

/** In-memory implementation of SettlementRepository. */
export class SettlementMemoryRepository implements SettlementRepository {
  private readonly store = new MemoryStore<Settlement & { id: string }>();
  private readonly clock = systemClock;

  async findById(id: string): Promise<Result<Settlement, AppError>> {
    const item = this.store.get(id);
    if (item === undefined) {
      return err(new RepositoryNotFoundError("Settlement", id));
    }
    return ok(item);
  }

  async list(options?: QueryOptions<Settlement>): Promise<Result<Page<Settlement>, AppError>> {
    let rows = this.store.all();
    if (options?.filter !== undefined) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }
    if (options?.sort !== undefined && options.sort.length > 0) {
      rows = applySort(rows, options.sort);
    }
    return ok(paginateArray(rows, options?.page));
  }

  async create(dto: CreateSettlement): Promise<Result<Settlement, AppError>> {
    const now = this.clock.nowIso();
    const id = newId("stl") as Settlement["id"];
    const settlement: Settlement = {
      id,
      orderId: dto.orderId as Settlement["orderId"],
      chain: "base",
      txHash: dto.txHash,
      fromAddress: dto.fromAddress,
      toAddress: dto.toAddress,
      amount: { amount: dto.amount.amount, currency: dto.amount.currency },
      status: "SUBMITTED",
      blockNumber: null,
      confirmedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const saved = this.store.set(settlement);
    return ok(saved);
  }

  async update(id: string, dto: UpdateSettlement): Promise<Result<Settlement, AppError>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Settlement", id));
    }
    const updated: Settlement = {
      ...existing,
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.blockNumber !== undefined ? { blockNumber: dto.blockNumber } : {}),
      ...(dto.confirmedAt !== undefined ? { confirmedAt: dto.confirmedAt } : {}),
      updatedAt: this.clock.nowIso(),
    };
    const saved = this.store.set(updated);
    return ok(saved);
  }

  async delete(id: string): Promise<Result<Settlement, AppError>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Settlement", id));
    }
    this.store.delete(id);
    return ok(existing);
  }

  async findByOrderId(orderId: string): Promise<Result<Settlement, AppError>> {
    const rows = this.store.all().filter((r) => r.orderId === orderId);
    if (rows.length === 0) {
      return err(new RepositoryNotFoundError("Settlement", orderId));
    }
    return ok(rows[0]!);
  }

  async findByTxHash(txHash: string): Promise<Result<Settlement, AppError>> {
    const rows = this.store.all().filter((r) => r.txHash === txHash);
    if (rows.length === 0) {
      return err(new RepositoryNotFoundError("Settlement", txHash));
    }
    return ok(rows[0]!);
  }

  async findByStatus(status: string, options?: QueryOptions<Settlement>): Promise<Result<Page<Settlement>, AppError>> {
    return this.list({
      ...options,
      filter: {
        and: [
          { field: "status", operator: "eq", value: status },
          ...(options?.filter?.and ?? []),
        ],
      },
    });
  }

  async findByFromAddress(fromAddress: string, options?: QueryOptions<Settlement>): Promise<Result<Page<Settlement>, AppError>> {
    return this.list({
      ...options,
      filter: {
        and: [
          { field: "fromAddress", operator: "eq", value: fromAddress },
          ...(options?.filter?.and ?? []),
        ],
      },
    });
  }

  async findByToAddress(toAddress: string, options?: QueryOptions<Settlement>): Promise<Result<Page<Settlement>, AppError>> {
    return this.list({
      ...options,
      filter: {
        and: [
          { field: "toAddress", operator: "eq", value: toAddress },
          ...(options?.filter?.and ?? []),
        ],
      },
    });
  }
}
