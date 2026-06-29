// In-memory implementation of DeliveryRepository using MemoryStore.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { NotFoundError, ConflictError } from "@veritas/core";
import type { Page, PageRequest } from "@veritas/core";
import type { Delivery, CreateDelivery, DeliveryStatus } from "@veritas/contracts";
import { MemoryStore } from "./memory-store.js";
import type { DeliveryRepository, DeliveryFilters } from "../repositories/delivery.repository.js";
import { RepositoryNotFoundError, RepositoryConflictError } from "../errors.js";
import { paginateArray } from "../pagination.js";
import {
  toDeliveryRow,
  fromDeliveryRow,
  mergeDeliveryRow,
  newDeliveryId,
  nowIso,
  type DeliveryRow,
} from "../mappers/delivery.mapper.js";

/** In-memory DeliveryRepository: suitable for testing and development. */
export class MemoryDeliveryRepository implements DeliveryRepository {
  private readonly store = new MemoryStore<DeliveryRow & { id: string }>();

  async findById(id: string): Promise<Result<Delivery, NotFoundError>> {
    const row = this.store.get(id);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("Delivery", id));
    }
    return ok(fromDeliveryRow(row));
  }

  async findByOrderId(orderId: string): Promise<Result<Delivery, NotFoundError>> {
    const row = this.store.all().find((r) => r.orderId === orderId);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("Delivery", `orderId:${orderId}`));
    }
    return ok(fromDeliveryRow(row));
  }

  async list(filters: DeliveryFilters, page: PageRequest): Promise<Page<Delivery>> {
    let rows = this.store.all();

    if (filters.orderId !== undefined) {
      rows = rows.filter((r) => r.orderId === filters.orderId);
    }
    if (filters.status !== undefined) {
      rows = rows.filter((r) => r.status === filters.status);
    }

    rows = rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const deliveries = rows.map(fromDeliveryRow);
    return paginateArray(deliveries, page);
  }

  async create(data: CreateDelivery): Promise<Result<Delivery, ConflictError>> {
    const existing = this.store.all().find((r) => r.orderId === data.orderId);
    if (existing !== undefined) {
      return err(new RepositoryConflictError("Delivery", `orderId already has a delivery: ${data.orderId}`));
    }

    const id = newDeliveryId();
    const now = nowIso();
    const row = toDeliveryRow(data, id, now);
    this.store.set(row);
    return ok(fromDeliveryRow(row));
  }

  async update(
    id: string,
    patch: Partial<CreateDelivery> & { status?: DeliveryStatus; deliveredAt?: string | null; contentHash?: string | null }
  ): Promise<Result<Delivery, NotFoundError>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Delivery", id));
    }

    const now = nowIso();
    const updated = mergeDeliveryRow(existing, patch as Partial<DeliveryRow>, now);
    this.store.set(updated);
    return ok(fromDeliveryRow(updated));
  }

  async delete(id: string): Promise<Result<void, NotFoundError>> {
    if (!this.store.has(id)) {
      return err(new RepositoryNotFoundError("Delivery", id));
    }
    this.store.delete(id);
    return ok(undefined);
  }
}
