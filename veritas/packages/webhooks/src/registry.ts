// Subscription registry for managing webhook subscriptions per organization.

import { epochToIso, newId, Result, ok, err } from "@veritas/core";
import { WebhookSubscription } from "./event.js";
import { isWebhookEventType } from "./event-types.js";
import {
  WebhookSubscriptionNotFoundError,
  WebhookSubscriptionConflictError,
  WebhookInvalidEventTypeError,
} from "./errors.js";

export interface CreateSubscriptionInput {
  organizationId: string;
  url: string;
  secret: string;
  eventTypes: string[];
}

export interface UpdateSubscriptionInput {
  url?: string;
  secret?: string;
  eventTypes?: string[];
  active?: boolean;
}

export interface SubscriptionStore {
  findById(id: string): Promise<WebhookSubscription | null>;
  findByOrganization(organizationId: string): Promise<WebhookSubscription[]>;
  findByOrgAndUrl(organizationId: string, url: string): Promise<WebhookSubscription | null>;
  save(subscription: WebhookSubscription): Promise<void>;
  update(id: string, patch: Partial<WebhookSubscription>): Promise<void>;
  delete(id: string): Promise<void>;
}

export class WebhookRegistry {
  constructor(private readonly store: SubscriptionStore) {}

  async register(
    input: CreateSubscriptionInput,
  ): Promise<Result<WebhookSubscription, WebhookSubscriptionConflictError | WebhookInvalidEventTypeError>> {
    for (const et of input.eventTypes) {
      if (!isWebhookEventType(et)) {
        return err(new WebhookInvalidEventTypeError(et));
      }
    }

    const existing = await this.store.findByOrgAndUrl(input.organizationId, input.url);
    if (existing !== null) {
      return err(new WebhookSubscriptionConflictError(`Subscription already exists for URL: ${input.url}`));
    }

    const now = epochToIso(Date.now());
    const subscription: WebhookSubscription = {
      id: newId("webhook"),
      organizationId: input.organizationId,
      url: input.url,
      secret: input.secret,
      eventTypes: [...input.eventTypes],
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    await this.store.save(subscription);
    return ok(subscription);
  }

  async update(
    id: string,
    input: UpdateSubscriptionInput,
  ): Promise<Result<WebhookSubscription, WebhookSubscriptionNotFoundError | WebhookInvalidEventTypeError>> {
    const existing = await this.store.findById(id);
    if (existing === null) {
      return err(new WebhookSubscriptionNotFoundError(id));
    }

    if (input.eventTypes !== undefined) {
      for (const et of input.eventTypes) {
        if (!isWebhookEventType(et)) {
          return err(new WebhookInvalidEventTypeError(et));
        }
      }
    }

    const updated: WebhookSubscription = {
      ...existing,
      url: input.url ?? existing.url,
      secret: input.secret ?? existing.secret,
      eventTypes: input.eventTypes !== undefined ? [...input.eventTypes] : existing.eventTypes,
      active: input.active !== undefined ? input.active : existing.active,
      updatedAt: epochToIso(Date.now()),
    };

    await this.store.update(id, updated);
    return ok(updated);
  }

  async deregister(id: string): Promise<Result<void, WebhookSubscriptionNotFoundError>> {
    const existing = await this.store.findById(id);
    if (existing === null) {
      return err(new WebhookSubscriptionNotFoundError(id));
    }
    await this.store.delete(id);
    return ok(undefined);
  }

  async getById(id: string): Promise<Result<WebhookSubscription, WebhookSubscriptionNotFoundError>> {
    const sub = await this.store.findById(id);
    if (sub === null) {
      return err(new WebhookSubscriptionNotFoundError(id));
    }
    return ok(sub);
  }

  async listByOrganization(organizationId: string): Promise<WebhookSubscription[]> {
    return this.store.findByOrganization(organizationId);
  }

  async findActiveForEventType(organizationId: string, eventType: string): Promise<WebhookSubscription[]> {
    const all = await this.store.findByOrganization(organizationId);
    return all.filter((s) => s.active && s.eventTypes.includes(eventType));
  }
}
