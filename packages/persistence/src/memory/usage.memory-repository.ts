// In-memory implementation of UsageRepository backed by MemoryStore.
import { ok, err, epochToIso } from "@veritas/core";
import type { Result, Page } from "@veritas/core";
import type { Usage, CreateUsage, UsageMetric } from "@veritas/contracts";
import { MemoryStore } from "./memory-store.js";
import { RepositoryNotFoundError } from "../errors.js";
import type { UsageRepository } from "../repositories/usage.repository.js";
import type { QueryOptions } from "../query.js";
import { evalFilter, applySort } from "../query.js";
import { paginateArray } from "../pagination.js";
import { rowToUsage, createDtoToRow, mergeRow, type UsageRow } from "../mappers/usage.mapper.js";

/** In-memory UsageRepository implementation for development and testing. */
export class UsageMemoryRepository implements UsageRepository {
  private readonly store = new MemoryStore<UsageRow & { readonly id: string }>();

  async findById(id: string): Promise<Result<Usage>> {
    const row = this.store.get(id);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("Usage", id));
    }
    return ok(rowToUsage(row));
  }

  async list(options?: QueryOptions<Usage>): Promise<Result<Page<Usage>>> {
    let rows = this.store.all().map(rowToUsage);
    if (options?.filter !== undefined) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }
    if (options?.sort !== undefined && options.sort.length > 0) {
      rows = applySort(rows, options.sort);
    } else {
      rows = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    const page = paginateArray(rows, options?.page);
    return ok(page);
  }

  async create(dto: CreateUsage): Promise<Result<Usage>> {
    const now = epochToIso(Date.now());
    const row = createDtoToRow(dto, now);
    const stored = this.store.set(row);
    return ok(rowToUsage(stored));
  }

  async update(id: string, dto: Partial<CreateUsage>): Promise<Result<Usage>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Usage", id));
    }
    const now = epochToIso(Date.now());
    const updated = mergeRow(existing, dto, now);
    const stored = this.store.set(updated);
    return ok(rowToUsage(stored));
  }

  async delete(id: string): Promise<Result<Usage>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Usage", id));
    }
    this.store.delete(id);
    return ok(rowToUsage(existing));
  }

  async findByOrganizationId(
    organizationId: string,
    options?: QueryOptions<Usage>,
  ): Promise<Result<Page<Usage>>> {
    let rows = this.store.all().map(rowToUsage).filter((r) => r.organizationId === organizationId);
    if (options?.filter !== undefined) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }
    if (options?.sort !== undefined && options.sort.length > 0) {
      rows = applySort(rows, options.sort);
    } else {
      rows = [...rows].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
    }
    return ok(paginateArray(rows, options?.page));
  }

  async findBySubscriptionId(
    subscriptionId: string,
    options?: QueryOptions<Usage>,
  ): Promise<Result<Page<Usage>>> {
    let rows = this.store.all().map(rowToUsage).filter((r) => r.subscriptionId === subscriptionId);
    if (options?.filter !== undefined) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }
    if (options?.sort !== undefined && options.sort.length > 0) {
      rows = applySort(rows, options.sort);
    } else {
      rows = [...rows].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
    }
    return ok(paginateArray(rows, options?.page));
  }

  async sumQuantityByMetric(
    organizationId: string,
    metric: UsageMetric,
    from: string,
    to: string,
  ): Promise<Result<number>> {
    const total = this.store
      .all()
      .map(rowToUsage)
      .filter(
        (r) =>
          r.organizationId === organizationId &&
          r.metric === metric &&
          r.recordedAt >= from &&
          r.recordedAt <= to,
      )
      .reduce((acc, r) => acc + r.quantity, 0);
    return ok(total);
  }

  async findByIdempotencyKey(key: string): Promise<Result<Usage>> {
    const match = this.store.all().map(rowToUsage).find((r) => r.idempotencyKey === key);
    if (match === undefined) {
      return err(new RepositoryNotFoundError("Usage", key));
    }
    return ok(match);
  }
}
