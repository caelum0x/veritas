// Service: full CRUD for webhook subscriptions delegating to WebhookRegistry from @veritas/webhooks.

import type { WebhookSubscription } from "@veritas/webhooks";
import {
  WebhookSubscriptionNotFoundError,
  WebhookSubscriptionConflictError,
  WebhookInvalidEventTypeError,
} from "@veritas/webhooks";
import type { Deps } from "../../container.js";
import { ApiError } from "../../http/api-error.js";
import type { CreateSubscriptionBody, UpdateSubscriptionBody } from "./subscriptions.schema.js";

export class SubscriptionsService {
  constructor(private readonly deps: Deps) {}

  async create(body: CreateSubscriptionBody): Promise<WebhookSubscription> {
    const result = await this.deps.webhookRegistry.register({
      organizationId: body.organizationId,
      url: body.url,
      secret: body.secret,
      eventTypes: body.eventTypes,
    });

    if (!result.ok) {
      const { error } = result;
      if (error instanceof WebhookSubscriptionConflictError) {
        throw ApiError.conflict(error.message);
      }
      if (error instanceof WebhookInvalidEventTypeError) {
        throw ApiError.unprocessable(error.message, { eventType: error.eventType });
      }
      throw ApiError.internal("Failed to create subscription");
    }

    this.deps.logger.info("Subscription created", {
      id: result.value.id,
      organizationId: body.organizationId,
    });

    return result.value;
  }

  async getById(id: string): Promise<WebhookSubscription> {
    const result = await this.deps.webhookRegistry.getById(id);

    if (!result.ok) {
      if (result.error instanceof WebhookSubscriptionNotFoundError) {
        throw ApiError.notFound(`Subscription ${id}`);
      }
      throw ApiError.internal("Failed to fetch subscription");
    }

    return result.value;
  }

  async listByOrganization(organizationId: string): Promise<WebhookSubscription[]> {
    return this.deps.webhookRegistry.listByOrganization(organizationId);
  }

  async update(id: string, body: UpdateSubscriptionBody): Promise<WebhookSubscription> {
    const result = await this.deps.webhookRegistry.update(id, {
      url: body.url,
      secret: body.secret,
      eventTypes: body.eventTypes,
      active: body.active,
    });

    if (!result.ok) {
      const { error } = result;
      if (error instanceof WebhookSubscriptionNotFoundError) {
        throw ApiError.notFound(`Subscription ${id}`);
      }
      if (error instanceof WebhookInvalidEventTypeError) {
        throw ApiError.unprocessable(error.message, { eventType: error.eventType });
      }
      throw ApiError.internal("Failed to update subscription");
    }

    this.deps.logger.info("Subscription updated", { id });

    return result.value;
  }

  async delete(id: string): Promise<void> {
    const result = await this.deps.webhookRegistry.deregister(id);

    if (!result.ok) {
      if (result.error instanceof WebhookSubscriptionNotFoundError) {
        throw ApiError.notFound(`Subscription ${id}`);
      }
      throw ApiError.internal("Failed to delete subscription");
    }

    this.deps.logger.info("Subscription deleted", { id });
  }
}
