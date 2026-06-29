// In-memory implementation of WebhookDeliveryRepository for testing and local development.
import { ok, err, type Result, type Page } from "@veritas/core";
import type { WebhookDelivery, CreateWebhookDelivery, WebhookDeliveryStatus } from "@veritas/contracts";
import type { WebhookDeliveryRepository } from "../repositories/webhookDelivery.repository.js";
import type { QueryOptions } from "../query.js";
import { evalFilter, applySort } from "../query.js";
import { paginateArray } from "../pagination.js";
import { RepositoryNotFoundError } from "../errors.js";
import {
  rowToWebhookDelivery,
  createDtoToRow,
  mergeRow,
  type WebhookDeliveryRow,
} from "../mappers/webhookDelivery.mapper.js";

type UpdateWebhookDelivery = Partial<Omit<WebhookDelivery, "id" | "createdAt" | "updatedAt">>;

/** In-memory store for WebhookDelivery rows, keyed by ID. */
export class WebhookDeliveryMemoryRepository implements WebhookDeliveryRepository {
  private readonly store = new Map<string, WebhookDeliveryRow>();

  private now(): string {
    return new Date().toISOString();
  }

  async findById(id: string): Promise<Result<WebhookDelivery>> {
    const row = this.store.get(id);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("WebhookDelivery", id));
    }
    return ok(rowToWebhookDelivery(row));
  }

  async list(options?: QueryOptions<WebhookDelivery>): Promise<Result<Page<WebhookDelivery>>> {
    let rows = Array.from(this.store.values()).map(rowToWebhookDelivery);

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

  async create(dto: CreateWebhookDelivery): Promise<Result<WebhookDelivery>> {
    const now = this.now();
    const row = createDtoToRow(dto, now);
    this.store.set(row.id, row);
    return ok(rowToWebhookDelivery(row));
  }

  async update(id: string, dto: UpdateWebhookDelivery): Promise<Result<WebhookDelivery>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("WebhookDelivery", id));
    }
    const updated = mergeRow(existing, dto, this.now());
    this.store.set(id, updated);
    return ok(rowToWebhookDelivery(updated));
  }

  async delete(id: string): Promise<Result<WebhookDelivery>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("WebhookDelivery", id));
    }
    this.store.delete(id);
    return ok(rowToWebhookDelivery(existing));
  }

  async findByWebhookId(
    webhookId: string,
    options?: QueryOptions<WebhookDelivery>
  ): Promise<Result<Page<WebhookDelivery>>> {
    return this.list({
      ...options,
      filter: {
        and: [
          { field: "webhookId", operator: "eq", value: webhookId },
          ...(options?.filter?.and ?? []),
        ],
      },
    });
  }

  async findByEventId(
    eventId: string,
    options?: QueryOptions<WebhookDelivery>
  ): Promise<Result<Page<WebhookDelivery>>> {
    return this.list({
      ...options,
      filter: {
        and: [
          { field: "eventId", operator: "eq", value: eventId },
          ...(options?.filter?.and ?? []),
        ],
      },
    });
  }

  async findByStatus(
    status: WebhookDeliveryStatus,
    options?: QueryOptions<WebhookDelivery>
  ): Promise<Result<Page<WebhookDelivery>>> {
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

  async findDueRetries(atOrBefore: string): Promise<Result<WebhookDelivery[]>> {
    const due = Array.from(this.store.values())
      .map(rowToWebhookDelivery)
      .filter(
        (d) =>
          d.status === "RETRYING" &&
          d.nextRetryAt !== null &&
          d.nextRetryAt <= atOrBefore
      )
      .sort((a, b) => (a.nextRetryAt ?? "").localeCompare(b.nextRetryAt ?? ""));
    return ok(due);
  }
}
