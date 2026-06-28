// Notification application service: use-cases for managing user notifications.
import { Result, AppError, ok, toPageRequest } from "@veritas/core";
import type { Page } from "@veritas/core";
import type { Notification, NotificationChannel } from "@veritas/contracts";
import type { NotificationRepository } from "@veritas/persistence";
import { BaseService, type BaseServiceDeps } from "../base-service.js";
import type { ServiceContext } from "../service-context.js";
import { serviceCall } from "../result.js";
import { ResourceNotFoundError, ServiceValidationError } from "../errors.js";
import type {
  CreateNotificationInput,
  UpdateNotificationInput,
  ListNotificationsInput,
} from "./notification.dto.js";

/** Dependencies injected into NotificationService. */
export interface NotificationServiceDeps extends BaseServiceDeps {
  readonly notificationRepository: NotificationRepository;
}

/** Application service for creating, querying, and marking notifications. */
export class NotificationService extends BaseService {
  private readonly notifications: NotificationRepository;

  constructor(deps: NotificationServiceDeps) {
    super(deps);
    this.notifications = deps.notificationRepository;
  }

  /** Retrieve a notification by its id. */
  async getById(
    ctx: ServiceContext,
    id: string,
  ): Promise<Result<Notification, AppError>> {
    return serviceCall(async () => {
      const result = await this.notifications.findById(id);
      if (!result.ok) {
        throw new ResourceNotFoundError("Notification", id);
      }
      this.log(ctx, "debug", "notification.getById", { notificationId: id });
      return result.value;
    });
  }

  /** List notifications with optional filters and pagination. */
  async list(
    ctx: ServiceContext,
    input: ListNotificationsInput,
  ): Promise<Result<Page<Notification>, AppError>> {
    return serviceCall(async () => {
      const { userId, channel, type, unreadOnly, cursor, limit } = input;
      const page = toPageRequest({ cursor, limit });

      if (userId && unreadOnly) {
        const result = await this.notifications.findUnreadByUserId(userId, { page: page });
        if (!result.ok) throw result.error;
        this.log(ctx, "debug", "notification.list", { userId, unreadOnly: true, count: result.value.items.length });
        return result.value;
      }

      if (userId) {
        const result = await this.notifications.findByUserId(userId, { page: page });
        if (!result.ok) throw result.error;
        this.log(ctx, "debug", "notification.list", { userId, count: result.value.items.length });
        return result.value;
      }

      if (channel) {
        const result = await this.notifications.findByChannel(channel as NotificationChannel, { page: page });
        if (!result.ok) throw result.error;
        this.log(ctx, "debug", "notification.list", { channel, count: result.value.items.length });
        return result.value;
      }

      if (type) {
        const result = await this.notifications.findByType(type, { page: page });
        if (!result.ok) throw result.error;
        this.log(ctx, "debug", "notification.list", { type, count: result.value.items.length });
        return result.value;
      }

      const result = await this.notifications.list({ page: page });
      if (!result.ok) throw result.error;
      this.log(ctx, "debug", "notification.list", { count: result.value.items.length });
      return result.value;
    });
  }

  /** Create and deliver a new notification to a user. */
  async create(
    ctx: ServiceContext,
    input: CreateNotificationInput,
  ): Promise<Result<Notification, AppError>> {
    return serviceCall(async () => {
      if (!input.userId || input.userId.trim().length === 0) {
        throw new ServiceValidationError("userId must not be blank.");
      }
      if (!input.title || input.title.trim().length === 0) {
        throw new ServiceValidationError("Notification title must not be blank.");
      }
      if (!input.body || input.body.trim().length === 0) {
        throw new ServiceValidationError("Notification body must not be blank.");
      }

      const result = await this.notifications.create(input);
      if (!result.ok) {
        throw result.error;
      }

      this.log(ctx, "info", "notification.created", {
        notificationId: result.value.id,
        userId: result.value.userId,
        channel: result.value.channel,
        type: result.value.type,
      });
      return result.value;
    });
  }

  /** Update mutable fields (sentAt, readAt, body) of an existing notification. */
  async update(
    ctx: ServiceContext,
    id: string,
    input: UpdateNotificationInput,
  ): Promise<Result<Notification, AppError>> {
    return serviceCall(async () => {
      const existing = await this.notifications.findById(id);
      if (!existing.ok) {
        throw new ResourceNotFoundError("Notification", id);
      }

      const result = await this.notifications.update(id, input);
      if (!result.ok) {
        throw new ResourceNotFoundError("Notification", id);
      }

      this.log(ctx, "info", "notification.updated", { notificationId: id });
      return result.value;
    });
  }

  /** Mark a single notification as read. */
  async markRead(
    ctx: ServiceContext,
    id: string,
  ): Promise<Result<Notification, AppError>> {
    return serviceCall(async () => {
      const result = await this.notifications.markRead(id);
      if (!result.ok) {
        throw new ResourceNotFoundError("Notification", id);
      }
      this.log(ctx, "info", "notification.markRead", { notificationId: id });
      return result.value;
    });
  }

  /** Mark all unread notifications for a user as read. Returns the count updated. */
  async markAllReadForUser(
    ctx: ServiceContext,
    userId: string,
  ): Promise<Result<number, AppError>> {
    return serviceCall(async () => {
      if (!userId || userId.trim().length === 0) {
        throw new ServiceValidationError("userId must not be blank.");
      }
      const result = await this.notifications.markAllReadByUserId(userId);
      if (!result.ok) {
        throw result.error;
      }
      this.log(ctx, "info", "notification.markAllRead", { userId, count: result.value });
      return result.value;
    });
  }

  /** Delete a notification by id. */
  async delete(
    ctx: ServiceContext,
    id: string,
  ): Promise<Result<void, AppError>> {
    return serviceCall(async () => {
      const result = await this.notifications.delete(id);
      if (!result.ok) {
        throw new ResourceNotFoundError("Notification", id);
      }
      this.log(ctx, "info", "notification.deleted", { notificationId: id });
    });
  }
}
