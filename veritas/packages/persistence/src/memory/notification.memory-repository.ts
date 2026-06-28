// In-memory implementation of NotificationRepository for testing and local development.
import { ok, err, type Result, type Page } from "@veritas/core";
import type { Notification, CreateNotification, NotificationChannel } from "@veritas/contracts";
import type { BaseRepository } from "../base-repository.js";
import type { QueryOptions } from "../query.js";
import { evalFilter, applySort } from "../query.js";
import { paginateArray } from "../pagination.js";
import { RepositoryNotFoundError } from "../errors.js";
import {
  rowToNotification,
  createDtoToRow,
  mergeNotificationRow,
  type NotificationRow,
} from "../mappers/notification.mapper.js";

/** Update shape for Notification entities. */
export interface UpdateNotification {
  readonly readAt?: string | null;
  readonly sentAt?: string | null;
  readonly metadata?: Record<string, unknown>;
}

/** In-memory store for Notification rows, keyed by ID. */
export class NotificationMemoryRepository
  implements BaseRepository<Notification, CreateNotification, UpdateNotification>
{
  private readonly store = new Map<string, NotificationRow>();

  async findById(id: string): Promise<Result<Notification>> {
    const row = this.store.get(id);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("Notification", id));
    }
    return ok(rowToNotification(row));
  }

  async list(options?: QueryOptions<Notification>): Promise<Result<Page<Notification>>> {
    let rows = Array.from(this.store.values()).map(rowToNotification);

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

  async create(dto: CreateNotification): Promise<Result<Notification>> {
    const row = createDtoToRow(dto, Date.now());
    this.store.set(row.id, row);
    return ok(rowToNotification(row));
  }

  async update(id: string, dto: UpdateNotification): Promise<Result<Notification>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Notification", id));
    }
    const updated = mergeNotificationRow(existing, dto);
    this.store.set(id, updated);
    return ok(rowToNotification(updated));
  }

  async delete(id: string): Promise<Result<Notification>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Notification", id));
    }
    this.store.delete(id);
    return ok(rowToNotification(existing));
  }

  /** Find all notifications for a specific user. */
  async findByUserId(
    userId: string,
    options?: QueryOptions<Notification>
  ): Promise<Result<Page<Notification>>> {
    return this.list({
      ...options,
      filter: {
        and: [
          { field: "userId", operator: "eq", value: userId },
          ...(options?.filter?.and ?? []),
        ],
      },
    });
  }

  /** Find all unread notifications for a specific user. */
  async findUnreadByUserId(
    userId: string,
    options?: QueryOptions<Notification>
  ): Promise<Result<Page<Notification>>> {
    return this.list({
      ...options,
      filter: {
        and: [
          { field: "userId", operator: "eq", value: userId },
          { field: "readAt", operator: "isNull" },
          ...(options?.filter?.and ?? []),
        ],
      },
    });
  }

  /** Find all notifications for a user filtered by channel. */
  async findByChannel(
    userId: string,
    channel: NotificationChannel,
    options?: QueryOptions<Notification>
  ): Promise<Result<Page<Notification>>> {
    return this.list({
      ...options,
      filter: {
        and: [
          { field: "userId", operator: "eq", value: userId },
          { field: "channel", operator: "eq", value: channel },
          ...(options?.filter?.and ?? []),
        ],
      },
    });
  }

  /** Mark a notification as read by setting readAt. */
  async markRead(id: string, readAt: string): Promise<Result<Notification>> {
    return this.update(id, { readAt });
  }
}
