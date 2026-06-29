// In-memory implementation of SubscriptionRepository for testing and local development.
import { ok, err, type Result, type Page, type PageRequest } from "@veritas/core";
import type { NotFoundError, ConflictError } from "@veritas/core";
import type { Subscription, CreateSubscription, UpdateSubscription } from "@veritas/contracts";
import type { SubscriptionRepository, SubscriptionFilters } from "../repositories/subscription.repository.js";
import {
  rowToSubscription,
  createDtoToRow,
  mergeRow,
  type SubscriptionRow,
} from "../mappers/subscription.mapper.js";
import { paginateArray } from "../pagination.js";
import { RepositoryNotFoundError, RepositoryConflictError } from "../errors.js";

/** In-memory store for Subscription rows, keyed by ID. */
export class SubscriptionMemoryRepository implements SubscriptionRepository {
  private readonly store = new Map<string, SubscriptionRow>();

  private now(): string {
    return new Date().toISOString();
  }

  async findById(id: string): Promise<Result<Subscription, NotFoundError>> {
    const row = this.store.get(id);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("Subscription", id)) as Result<Subscription, NotFoundError>;
    }
    return ok(rowToSubscription(row));
  }

  async findActiveByOrganizationId(
    organizationId: string
  ): Promise<Result<Subscription, NotFoundError>> {
    const found = Array.from(this.store.values())
      .map(rowToSubscription)
      .filter(
        (s) =>
          s.organizationId === organizationId &&
          (s.status === "ACTIVE" || s.status === "TRIALING")
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

    if (found === undefined) {
      return err(
        new RepositoryNotFoundError("Subscription", `active for org:${organizationId}`)
      ) as Result<Subscription, NotFoundError>;
    }
    return ok(found);
  }

  async list(filters: SubscriptionFilters, page: PageRequest): Promise<Page<Subscription>> {
    let rows = Array.from(this.store.values()).map(rowToSubscription);

    if (filters.organizationId !== undefined) {
      rows = rows.filter((r) => r.organizationId === filters.organizationId);
    }
    if (filters.planId !== undefined) {
      rows = rows.filter((r) => r.planId === filters.planId);
    }
    if (filters.status !== undefined) {
      rows = rows.filter((r) => r.status === filters.status);
    }

    rows = rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return paginateArray(rows, page);
  }

  async create(data: CreateSubscription): Promise<Result<Subscription, ConflictError>> {
    const hasActive = Array.from(this.store.values()).some(
      (r) =>
        r.organizationId === data.organizationId &&
        (r.status === "ACTIVE" || r.status === "TRIALING")
    );
    if (hasActive) {
      return err(
        new RepositoryConflictError("Subscription", `organization ${data.organizationId} already has an active subscription`)
      ) as Result<Subscription, ConflictError>;
    }
    const now = this.now();
    const row = createDtoToRow(data, now);
    this.store.set(row.id, row);
    return ok(rowToSubscription(row));
  }

  async update(id: string, data: UpdateSubscription): Promise<Result<Subscription, NotFoundError>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Subscription", id)) as Result<Subscription, NotFoundError>;
    }
    const updated = mergeRow(existing, data, this.now());
    this.store.set(id, updated);
    return ok(rowToSubscription(updated));
  }

  async delete(id: string): Promise<Result<void, NotFoundError>> {
    if (!this.store.has(id)) {
      return err(new RepositoryNotFoundError("Subscription", id)) as Result<void, NotFoundError>;
    }
    this.store.delete(id);
    return ok(undefined);
  }
}
