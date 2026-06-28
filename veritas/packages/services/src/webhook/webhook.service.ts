// Webhook application service: CRUD for endpoints and delivery management.
import {
  Result,
  AppError,
  newId,
  Page,
  makePage,
  encodeCursor,
  decodeCursor,
  toPageRequest,
} from "@veritas/core";
import {
  WebhookSchema,
  CreateWebhookDeliverySchema,
} from "@veritas/contracts";
import { z } from "zod";
import { BaseService, BaseServiceDeps } from "../base-service.js";
import type { ServiceContext } from "../service-context.js";
import { serviceCall } from "../result.js";
import { ResourceNotFoundError, InsufficientPermissionsError } from "../errors.js";
import type {
  CreateWebhookInput,
  UpdateWebhookInput,
  ListWebhooksInput,
  ListWebhookDeliveriesInput,
  RetryWebhookDeliveryInput,
  WebhookOutput,
  WebhookDeliveryOutput,
  WebhookListOutput,
  WebhookDeliveryListOutput,
} from "./webhook.dto.js";

type WebhookRecord = z.infer<typeof WebhookSchema>;
type DeliveryRecord = z.infer<typeof CreateWebhookDeliverySchema> & {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  responseStatus: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  nextRetryAt: string | null;
};

/** In-memory stores for webhook records and deliveries (replaced by persistence layer in prod). */
const webhookStore = new Map<string, WebhookRecord>();
const deliveryStore = new Map<string, DeliveryRecord>();

export interface WebhookServiceDeps extends BaseServiceDeps {}

/** Application service for managing webhooks and their delivery history. */
export class WebhookService extends BaseService {
  constructor(deps: Partial<WebhookServiceDeps> = {}) {
    super(deps);
  }

  /** Register a new webhook endpoint for the caller's organisation. */
  async create(
    ctx: ServiceContext,
    input: CreateWebhookInput,
  ): Promise<Result<WebhookOutput, AppError>> {
    return serviceCall(async () => {
      const now = this.now();
      const id = newId("wh");
      const record: WebhookRecord = {
        id,
        ...input,
        createdAt: now,
        updatedAt: now,
      } as unknown as WebhookRecord;
      webhookStore.set(id, record);
      this.log(ctx, "info", "Webhook created", { webhookId: id });
      return { ...record };
    });
  }

  /** Retrieve a single webhook by its ID, enforcing org ownership. */
  async getById(
    ctx: ServiceContext,
    webhookId: string,
  ): Promise<Result<WebhookOutput, AppError>> {
    return serviceCall(async () => {
      const record = webhookStore.get(webhookId);
      if (!record) throw new ResourceNotFoundError("Webhook", webhookId);
      this.assertOwnership(ctx, record);
      return { ...record };
    });
  }

  /** Update mutable fields of an existing webhook. */
  async update(
    ctx: ServiceContext,
    webhookId: string,
    input: UpdateWebhookInput,
  ): Promise<Result<WebhookOutput, AppError>> {
    return serviceCall(async () => {
      const existing = webhookStore.get(webhookId);
      if (!existing) throw new ResourceNotFoundError("Webhook", webhookId);
      this.assertOwnership(ctx, existing);
      const updated: WebhookRecord = {
        ...existing,
        ...input,
        updatedAt: this.now(),
      } as WebhookRecord;
      webhookStore.set(webhookId, updated);
      this.log(ctx, "info", "Webhook updated", { webhookId });
      return { ...updated };
    });
  }

  /** Delete (unregister) a webhook endpoint. */
  async delete(
    ctx: ServiceContext,
    webhookId: string,
  ): Promise<Result<void, AppError>> {
    return serviceCall(async () => {
      const existing = webhookStore.get(webhookId);
      if (!existing) throw new ResourceNotFoundError("Webhook", webhookId);
      this.assertOwnership(ctx, existing);
      webhookStore.delete(webhookId);
      this.log(ctx, "info", "Webhook deleted", { webhookId });
    });
  }

  /** List webhooks for the calling organisation, with optional filters. */
  async list(
    ctx: ServiceContext,
    input: ListWebhooksInput,
  ): Promise<Result<WebhookListOutput, AppError>> {
    return serviceCall(async () => {
      const orgId = ctx.principal.orgId ?? ctx.principal.userId;
      let items = Array.from(webhookStore.values()).filter(
        (w) => (w as unknown as Record<string, unknown>)["orgId"] === orgId,
      );
      if (input.enabled !== undefined) {
        items = items.filter(
          (w) => (w as unknown as Record<string, unknown>)["enabled"] === input.enabled,
        );
      }
      const { limit } = toPageRequest({ limit: input.limit, cursor: input.cursor });
      const offset = input.cursor ? Number(decodeCursor(input.cursor) ?? 0) : 0;
      const page = items.slice(offset, offset + limit);
      const nextCursor =
        offset + limit < items.length ? encodeCursor({ offset: offset + limit }) : null;
      return { items: page.map((w) => ({ ...w })), nextCursor, total: items.length };
    });
  }

  /** List delivery attempts for a specific webhook. */
  async listDeliveries(
    ctx: ServiceContext,
    input: ListWebhookDeliveriesInput,
  ): Promise<Result<WebhookDeliveryListOutput, AppError>> {
    return serviceCall(async () => {
      const webhook = webhookStore.get(input.webhookId);
      if (!webhook) throw new ResourceNotFoundError("Webhook", input.webhookId);
      this.assertOwnership(ctx, webhook);
      let deliveries = Array.from(deliveryStore.values()).filter(
        (d) => d.webhookId === input.webhookId,
      );
      if (input.status !== undefined) {
        deliveries = deliveries.filter((d) => d.status === input.status);
      }
      const { limit } = toPageRequest({ limit: input.limit, cursor: input.cursor });
      const offset = input.cursor ? Number(decodeCursor(input.cursor) ?? 0) : 0;
      const page = deliveries.slice(offset, offset + limit);
      const nextCursor =
        offset + limit < deliveries.length
          ? encodeCursor({ offset: offset + limit })
          : null;
      return {
        items: page.map((d) => ({ ...d } as unknown as WebhookDeliveryOutput)),
        nextCursor,
        total: deliveries.length,
      };
    });
  }

  /** Manually trigger a retry of a failed delivery attempt. */
  async retryDelivery(
    ctx: ServiceContext,
    input: RetryWebhookDeliveryInput,
  ): Promise<Result<WebhookDeliveryOutput, AppError>> {
    return serviceCall(async () => {
      const delivery = deliveryStore.get(input.deliveryId);
      if (!delivery) throw new ResourceNotFoundError("WebhookDelivery", input.deliveryId);
      const webhook = webhookStore.get(delivery.webhookId);
      if (!webhook) throw new ResourceNotFoundError("Webhook", delivery.webhookId);
      this.assertOwnership(ctx, webhook);
      const updated: DeliveryRecord = {
        ...delivery,
        status: "PENDING",
        nextRetryAt: this.now(),
        updatedAt: this.now(),
        attemptCount: delivery.attemptCount + 1,
      };
      deliveryStore.set(input.deliveryId, updated);
      this.log(ctx, "info", "Webhook delivery retry queued", {
        deliveryId: input.deliveryId,
      });
      return { ...updated } as unknown as WebhookDeliveryOutput;
    });
  }

  /** Assert that the calling principal owns the webhook's organisation. */
  private assertOwnership(ctx: ServiceContext, webhook: WebhookRecord): void {
    const orgId = ctx.principal.orgId ?? ctx.principal.userId;
    const webhookOrgId = (webhook as unknown as Record<string, unknown>)["orgId"];
    const isAdmin = ctx.principal.roles.includes("admin");
    if (!isAdmin && webhookOrgId !== orgId) {
      throw new InsufficientPermissionsError("access webhook");
    }
  }
}
