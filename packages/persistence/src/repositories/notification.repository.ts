// NotificationRepository interface defining persistence operations for user notifications.

import type { Result, Page } from "@veritas/core";
import type { Notification, CreateNotification, NotificationChannel } from "@veritas/contracts";
import type { BaseRepository } from "../base-repository.js";
import type { QueryOptions } from "../query.js";

/** Extended repository interface for Notification entities. */
export interface NotificationRepository
  extends BaseRepository<Notification, CreateNotification, Partial<CreateNotification>> {
  /** Find a single notification by its opaque ID. */
  findById(id: string): Promise<Result<Notification>>;

  /** List notifications with optional filtering, sorting, and cursor pagination. */
  list(options?: QueryOptions<Notification>): Promise<Result<Page<Notification>>>;

  /** Create a new notification for a user. */
  create(dto: CreateNotification): Promise<Result<Notification>>;

  /** Apply a partial update (e.g. mark read, set sentAt) to an existing notification. */
  update(
    id: string,
    dto: Partial<CreateNotification> & { readAt?: string | null; sentAt?: string | null },
  ): Promise<Result<Notification>>;

  /** Delete a notification by ID, returning the deleted entity. */
  delete(id: string): Promise<Result<Notification>>;

  /** Find all notifications for a given user, ordered by createdAt descending. */
  findByUserId(
    userId: string,
    options?: QueryOptions<Notification>,
  ): Promise<Result<Page<Notification>>>;

  /** Find unread notifications for a given user. */
  findUnreadByUserId(
    userId: string,
    options?: QueryOptions<Notification>,
  ): Promise<Result<Page<Notification>>>;

  /** Find notifications by delivery channel. */
  findByChannel(
    channel: NotificationChannel,
    options?: QueryOptions<Notification>,
  ): Promise<Result<Page<Notification>>>;

  /** Find notifications by type identifier (e.g. "order.completed"). */
  findByType(
    type: string,
    options?: QueryOptions<Notification>,
  ): Promise<Result<Page<Notification>>>;

  /** Mark a notification as read, setting readAt to the current timestamp. */
  markRead(id: string): Promise<Result<Notification>>;

  /** Mark all unread notifications for a user as read. */
  markAllReadByUserId(userId: string): Promise<Result<number>>;
}
