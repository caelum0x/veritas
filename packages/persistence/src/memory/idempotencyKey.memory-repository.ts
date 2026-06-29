// In-memory implementation of IdempotencyKeyRepository for testing and local development.
import { ok, err, type Result, type Page } from "@veritas/core";
import type { IdempotencyKey, CreateIdempotencyKey } from "@veritas/contracts";
import type { IdempotencyKeyRepository, UpdateIdempotencyKey } from "../repositories/idempotencyKey.repository.js";
import type { QueryOptions } from "../query.js";
import { evalFilter, applySort } from "../query.js";
import { paginateArray } from "../pagination.js";
import { RepositoryNotFoundError } from "../errors.js";
import {
  rowToIdempotencyKey,
  createDtoToRow,
  mergeIdempotencyKeyRow,
  type IdempotencyKeyRow,
} from "../mappers/idempotencyKey.mapper.js";

/** In-memory store for IdempotencyKey rows, keyed by ID. */
export class IdempotencyKeyMemoryRepository implements IdempotencyKeyRepository {
  private readonly store = new Map<string, IdempotencyKeyRow>();

  async findById(id: string): Promise<Result<IdempotencyKey>> {
    const row = this.store.get(id);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("IdempotencyKey", id));
    }
    return ok(rowToIdempotencyKey(row));
  }

  async list(options?: QueryOptions<IdempotencyKey>): Promise<Result<Page<IdempotencyKey>>> {
    let rows = Array.from(this.store.values()).map(rowToIdempotencyKey);

    if (options?.filter !== undefined) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }

    if (options?.sort !== undefined && options.sort.length > 0) {
      rows = applySort(rows, options.sort);
    } else {
      rows = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    return ok(paginateArray(rows, options?.page));
  }

  async create(dto: CreateIdempotencyKey): Promise<Result<IdempotencyKey>> {
    const row = createDtoToRow(dto, Date.now());
    this.store.set(row.id, row);
    return ok(rowToIdempotencyKey(row));
  }

  async update(id: string, dto: UpdateIdempotencyKey): Promise<Result<IdempotencyKey>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("IdempotencyKey", id));
    }
    const updated = mergeIdempotencyKeyRow(existing, dto);
    this.store.set(id, updated);
    return ok(rowToIdempotencyKey(updated));
  }

  async delete(id: string): Promise<Result<IdempotencyKey>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("IdempotencyKey", id));
    }
    this.store.delete(id);
    return ok(rowToIdempotencyKey(existing));
  }

  async findByKey(
    key: string,
    organizationId?: string | null
  ): Promise<Result<IdempotencyKey>> {
    for (const row of this.store.values()) {
      if (row.key === key) {
        const orgMatch =
          organizationId === undefined ||
          row.organizationId === (organizationId ?? null);
        if (orgMatch) {
          return ok(rowToIdempotencyKey(row));
        }
      }
    }
    return err(new RepositoryNotFoundError("IdempotencyKey", key));
  }

  async findExpired(
    now: string,
    options?: QueryOptions<IdempotencyKey>
  ): Promise<Result<Page<IdempotencyKey>>> {
    return this.list({
      ...options,
      filter: {
        and: [
          { field: "expiresAt", operator: "lte", value: now },
          ...(options?.filter?.and ?? []),
        ],
      },
    });
  }

  async findByOrganizationId(
    organizationId: string,
    options?: QueryOptions<IdempotencyKey>
  ): Promise<Result<Page<IdempotencyKey>>> {
    return this.list({
      ...options,
      filter: {
        and: [
          { field: "organizationId", operator: "eq", value: organizationId },
          ...(options?.filter?.and ?? []),
        ],
      },
    });
  }
}
