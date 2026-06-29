// In-memory implementation of WebhookRepository for testing and local development.
import { ok, err, type Result, type Page } from "@veritas/core";
import type { Webhook, CreateWebhook, UpdateWebhook } from "@veritas/contracts";
import type { WebhookRepository } from "../repositories/webhook.repository.js";
import type { QueryOptions } from "../query.js";
import { evalFilter, applySort } from "../query.js";
import { paginateArray } from "../pagination.js";
import { RepositoryNotFoundError } from "../errors.js";
import {
  rowToWebhook,
  createDtoToRow,
  mergeRow,
  type WebhookRow,
} from "../mappers/webhook.mapper.js";

/** In-memory store for Webhook rows, keyed by ID. */
export class WebhookMemoryRepository implements WebhookRepository {
  private readonly store = new Map<string, WebhookRow>();

  private now(): string {
    return new Date().toISOString();
  }

  async findById(id: string): Promise<Result<Webhook>> {
    const row = this.store.get(id);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("Webhook", id));
    }
    return ok(rowToWebhook(row));
  }

  async list(options?: QueryOptions<Webhook>): Promise<Result<Page<Webhook>>> {
    let rows = Array.from(this.store.values()).map(rowToWebhook);

    if (options?.filter !== undefined) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }

    if (options?.sort !== undefined && options.sort.length > 0) {
      rows = applySort(rows, options.sort);
    } else {
      rows = rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }

    return ok(paginateArray(rows, options?.page));
  }

  async create(dto: CreateWebhook): Promise<Result<Webhook>> {
    const now = this.now();
    const row = createDtoToRow(dto, now);
    this.store.set(row.id, row);
    return ok(rowToWebhook(row));
  }

  async update(id: string, dto: UpdateWebhook): Promise<Result<Webhook>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Webhook", id));
    }
    const updated = mergeRow(existing, dto, this.now());
    this.store.set(id, updated);
    return ok(rowToWebhook(updated));
  }

  async delete(id: string): Promise<Result<Webhook>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Webhook", id));
    }
    this.store.delete(id);
    return ok(rowToWebhook(existing));
  }

  async findByOrganizationId(
    organizationId: string,
    options?: QueryOptions<Webhook>
  ): Promise<Result<Page<Webhook>>> {
    const filterOptions: QueryOptions<Webhook> = {
      ...options,
      filter: {
        and: [
          { field: "organizationId", operator: "eq", value: organizationId },
          ...(options?.filter?.and ?? []),
        ],
      },
    };
    return this.list(filterOptions);
  }

  async findActiveByEvent(
    event: string,
    options?: QueryOptions<Webhook>
  ): Promise<Result<Page<Webhook>>> {
    let rows = Array.from(this.store.values())
      .map(rowToWebhook)
      .filter((w) => w.active && w.events.includes(event));

    if (options?.filter !== undefined) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }

    if (options?.sort !== undefined && options.sort.length > 0) {
      rows = applySort(rows, options.sort);
    } else {
      rows = rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }

    return ok(paginateArray(rows, options?.page));
  }

  async findAllActive(options?: QueryOptions<Webhook>): Promise<Result<Page<Webhook>>> {
    const filterOptions: QueryOptions<Webhook> = {
      ...options,
      filter: {
        and: [
          { field: "active", operator: "eq", value: true },
          ...(options?.filter?.and ?? []),
        ],
      },
    };
    return this.list(filterOptions);
  }
}
