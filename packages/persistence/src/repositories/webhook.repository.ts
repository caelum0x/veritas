// WebhookRepository interface for managing webhook subscriber endpoints.
import type { Result, Page } from "@veritas/core";
import type { Webhook, CreateWebhook, UpdateWebhook } from "@veritas/contracts";
import type { BaseRepository } from "../base-repository.js";
import type { QueryOptions } from "../query.js";

/** Repository interface for Webhook entities. */
export interface WebhookRepository extends BaseRepository<Webhook, CreateWebhook, UpdateWebhook> {
  /** Find all webhooks registered for a given organization. */
  findByOrganizationId(organizationId: string, options?: QueryOptions<Webhook>): Promise<Result<Page<Webhook>>>;

  /** Find all active webhooks subscribed to a specific event type. */
  findActiveByEvent(event: string, options?: QueryOptions<Webhook>): Promise<Result<Page<Webhook>>>;

  /** Find all active webhooks (active === true). */
  findAllActive(options?: QueryOptions<Webhook>): Promise<Result<Page<Webhook>>>;
}
