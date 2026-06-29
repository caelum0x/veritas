// Maps WebhookSubscription domain objects to HTTP response DTOs.

import type { WebhookSubscription } from "@veritas/webhooks";

export interface SubscriptionDto {
  readonly id: string;
  readonly organizationId: string;
  readonly url: string;
  readonly eventTypes: readonly string[];
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Projects a domain WebhookSubscription to a safe API response DTO (no secret). */
export function toSubscriptionDto(sub: WebhookSubscription): SubscriptionDto {
  return {
    id: sub.id,
    organizationId: sub.organizationId,
    url: sub.url,
    eventTypes: [...sub.eventTypes],
    active: sub.active,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
  };
}

/** Maps a list of subscriptions to DTOs. */
export function toSubscriptionDtoList(subs: readonly WebhookSubscription[]): SubscriptionDto[] {
  return subs.map(toSubscriptionDto);
}
