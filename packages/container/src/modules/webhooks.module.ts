// Registers webhook dispatcher, registry, delivery tracker, and signer into the DI container.

import type { Container } from "../container.js";
import type { Token } from "../tokens.js";
import {
  WebhookRegistry,
  DeliveryTracker,
  WebhookSigner,
  DEFAULT_RETRY_POLICY,
} from "@veritas/webhooks";
import type { SubscriptionStore } from "@veritas/webhooks";
import type { DeliveryStore } from "@veritas/webhooks";
import { noopLogger } from "@veritas/core";
import type { Logger } from "@veritas/core";
import {
  LOGGER,
  WEBHOOK_REPO,
  WEBHOOK_DELIVERY_REPO,
} from "../tokens.js";
import type { WebhookRepository, WebhookDeliveryRepository } from "@veritas/persistence";

/** Local token factory (mirrors the one in tokens.ts). */
function token<T>(name: string): Token<T> {
  return Symbol(name) as Token<T>;
}

/** Module-local tokens for webhook sub-services not listed in the shared token registry. */
const WEBHOOK_SIGNER_TOKEN = token<WebhookSigner>("WebhookSigner");
const WEBHOOK_REGISTRY_TOKEN = token<WebhookRegistry>("WebhookRegistry");
const WEBHOOK_DELIVERY_TRACKER_TOKEN = token<DeliveryTracker>("DeliveryTracker");

/**
 * Wire webhook subsystem services.
 * Requires WEBHOOK_REPO and WEBHOOK_DELIVERY_REPO to be registered before this module.
 */
export function registerWebhooksModule(container: Container): void {
  // HMAC signer — uses a hardcoded dev secret; override via an infrastructure binding.
  container.singleton(WEBHOOK_SIGNER_TOKEN, (): WebhookSigner => {
    const secret = "default-dev-secret-change-in-production";
    return new WebhookSigner({ secret });
  });

  // Subscription registry — manages create/update/delete of webhook subscriptions.
  container.singleton(WEBHOOK_REGISTRY_TOKEN, (c): WebhookRegistry => {
    // WebhookRepository is compatible with SubscriptionStore interface.
    const repo = c.resolve<WebhookRepository>(WEBHOOK_REPO);
    return new WebhookRegistry(repo as unknown as SubscriptionStore);
  });

  // Delivery tracker — persists delivery attempts and computes retry schedules.
  container.singleton(WEBHOOK_DELIVERY_TRACKER_TOKEN, (c): DeliveryTracker => {
    const repo = c.resolve<WebhookDeliveryRepository>(WEBHOOK_DELIVERY_REPO);
    return new DeliveryTracker(repo as unknown as DeliveryStore, DEFAULT_RETRY_POLICY);
  });
}

export {
  WEBHOOK_SIGNER_TOKEN,
  WEBHOOK_REGISTRY_TOKEN,
  WEBHOOK_DELIVERY_TRACKER_TOKEN,
};
