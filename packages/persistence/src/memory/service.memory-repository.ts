// In-memory implementation of ServiceRepository backed by MemoryStore.

import { ok, err, type Result, type Page } from "@veritas/core";
import type { Service, CreateService, UpdateService } from "@veritas/contracts";
import type { ServiceRepository } from "../repositories/service.repository.js";
import { MemoryStore } from "./memory-store.js";
import { RepositoryNotFoundError, RepositoryConflictError } from "../errors.js";
import { paginateArray } from "../pagination.js";
import { evalFilter, applySort, type QueryOptions } from "../query.js";
import {
  toServiceRow,
  toServiceDomain,
  mergeServiceRow,
  fromServiceDomain,
  type ServiceRow,
} from "../mappers/service.mapper.js";

/** In-memory ServiceRepository implementation. */
export class InMemoryServiceRepository implements ServiceRepository {
  private readonly store = new MemoryStore<ServiceRow & { id: string }>();

  async findById(id: string): Promise<Result<Service>> {
    const row = this.store.get(id);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("Service", id));
    }
    return ok(toServiceDomain(row));
  }

  async findBySlug(slug: string): Promise<Result<Service>> {
    const found = this.store.all().find((r) => r.slug === slug);
    if (found === undefined) {
      return err(new RepositoryNotFoundError("Service", `slug:${slug}`));
    }
    return ok(toServiceDomain(found));
  }

  async findActive(options?: QueryOptions<Service>): Promise<Result<Page<Service>>> {
    const activeFilter: QueryOptions<Service> = {
      ...options,
      filter: {
        and: [
          { field: "active", operator: "eq", value: true },
          ...(options?.filter?.and ?? []),
        ],
      },
    };
    return this.list(activeFilter);
  }

  async list(options?: QueryOptions<Service>): Promise<Result<Page<Service>>> {
    let rows = this.store.all().map(toServiceDomain);

    if (options?.filter) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }

    if (options?.sort) {
      rows = applySort(rows, options.sort);
    }

    const page = paginateArray(rows, options?.page);
    return ok(page);
  }

  async create(dto: CreateService): Promise<Result<Service>> {
    const existing = this.store.all().find((r) => r.slug === dto.slug);
    if (existing !== undefined) {
      return err(new RepositoryConflictError("Service", `slug '${dto.slug}' already exists`));
    }
    const row = toServiceRow(dto);
    const stored = this.store.set(row);
    return ok(toServiceDomain(stored));
  }

  async update(id: string, dto: UpdateService): Promise<Result<Service>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Service", id));
    }
    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      const slugConflict = this.store.all().find((r) => r.slug === dto.slug && r.id !== id);
      if (slugConflict !== undefined) {
        return err(new RepositoryConflictError("Service", `slug '${dto.slug}' already exists`));
      }
    }
    const updated = mergeServiceRow(existing, dto);
    const stored = this.store.set(updated);
    return ok(toServiceDomain(stored));
  }

  async delete(id: string): Promise<Result<Service>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Service", id));
    }
    this.store.delete(id);
    return ok(toServiceDomain(existing));
  }
}
