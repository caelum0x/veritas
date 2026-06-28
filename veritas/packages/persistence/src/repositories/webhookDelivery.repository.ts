// WebhookDeliveryRepository interface for persisting webhook delivery attempt records.
import type { Result, Page } from "@veritas/core";
import type { WebhookDelivery, CreateWebhookDelivery, WebhookDeliveryStatus } from "@veritas/contracts";
import type { BaseRepository } from "../base-repository.js";
import type { QueryOptions } from "../query.js";

/** Extended repository interface for WebhookDelivery entities. */
export interface WebhookDeliveryRepository
  extends BaseRepository<WebhookDelivery, CreateWebhookDelivery, Partial<Omit<WebhookDelivery, "id" | "createdAt" | "updatedAt">>> {
  /** Find a single delivery attempt by its opaque ID. */
  findById(id: string): Promise<Result<WebhookDelivery>>;

  /** List delivery attempts with optional filtering, sorting, and cursor pagination. */
  list(options?: QueryOptions<WebhookDelivery>): Promise<Result<Page<WebhookDelivery>>>;

  /** Create a new delivery attempt record. */
  create(dto: CreateWebhookDelivery): Promise<Result<WebhookDelivery>>;

  /** Apply a partial update to an existing delivery attempt. */
  update(id: string, dto: Partial<Omit<WebhookDelivery, "id" | "createdAt" | "updatedAt">>): Promise<Result<WebhookDelivery>>;

  /** Delete a delivery attempt by ID. */
  delete(id: string): Promise<Result<WebhookDelivery>>;

  /** Find all delivery attempts for a specific webhook. */
  findByWebhookId(webhookId: string, options?: QueryOptions<WebhookDelivery>): Promise<Result<Page<WebhookDelivery>>>;

  /** Find all delivery attempts associated with a specific event. */
  findByEventId(eventId: string, options?: QueryOptions<WebhookDelivery>): Promise<Result<Page<WebhookDelivery>>>;

  /** Find all delivery attempts matching a specific status. */
  findByStatus(status: WebhookDeliveryStatus, options?: QueryOptions<WebhookDelivery>): Promise<Result<Page<WebhookDelivery>>>;

  /** Find pending retries due at or before a given ISO timestamp. */
  findDueRetries(atOrBefore: string): Promise<Result<WebhookDelivery[]>>;
}
