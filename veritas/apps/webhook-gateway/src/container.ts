// Builds and wires all package services/repositories into the Deps object.

import type { AppConfig } from "./config.js";
import type { Logger } from "@veritas/observability";
import { createLogger, MetricsRegistry } from "@veritas/observability";
import {
  WebhookRegistry,
  WebhookSigner,
  WebhookVerifier,
  DeliveryTracker,
  DEFAULT_RETRY_POLICY,
  createRetryPolicy,
  type SubscriptionStore,
  type DeliveryStore,
} from "@veritas/webhooks";
import {
  ApiKeyAuthenticator,
  createApiKeyHasher,
  type Authenticator,
  type ApiKeyStore,
  type StoredApiKey,
} from "@veritas/auth";
import {
  AlwaysHealthyCheck,
  type HealthCheck,
} from "@veritas/observability";

// ── In-memory SubscriptionStore ───────────────────────────────────────────────

class InMemorySubscriptionStore implements SubscriptionStore {
  private readonly data = new Map<string, import("@veritas/webhooks").WebhookSubscription>();

  async findById(id: string) {
    return this.data.get(id) ?? null;
  }

  async findByOrganization(organizationId: string) {
    return [...this.data.values()].filter((s) => s.organizationId === organizationId);
  }

  async findByOrgAndUrl(organizationId: string, url: string) {
    return (
      [...this.data.values()].find(
        (s) => s.organizationId === organizationId && s.url === url,
      ) ?? null
    );
  }

  async save(subscription: import("@veritas/webhooks").WebhookSubscription): Promise<void> {
    this.data.set(subscription.id, subscription);
  }

  async update(id: string, patch: Partial<import("@veritas/webhooks").WebhookSubscription>): Promise<void> {
    const existing = this.data.get(id);
    if (existing) {
      this.data.set(id, { ...existing, ...patch });
    }
  }

  async delete(id: string): Promise<void> {
    this.data.delete(id);
  }
}

// ── In-memory DeliveryStore ───────────────────────────────────────────────────

class InMemoryDeliveryStore implements DeliveryStore {
  private readonly data = new Map<string, import("@veritas/webhooks").DeliveryRecord>();

  async save(record: import("@veritas/webhooks").DeliveryRecord): Promise<void> {
    this.data.set(record.id, record);
  }

  async findById(id: string) {
    return this.data.get(id) ?? null;
  }

  async findBySubscriptionId(subscriptionId: string, limit = 50) {
    return [...this.data.values()]
      .filter((r) => r.subscriptionId === subscriptionId)
      .slice(0, limit);
  }

  async update(id: string, patch: Partial<import("@veritas/webhooks").DeliveryRecord>): Promise<void> {
    const existing = this.data.get(id);
    if (existing) {
      this.data.set(id, { ...existing, ...patch });
    }
  }
}

// ── In-memory ApiKeyStore (for dev; replace with DB-backed impl in prod) ─────

class InMemoryApiKeyStore implements ApiKeyStore {
  private readonly keys = new Map<string, StoredApiKey>();

  register(key: StoredApiKey): void {
    this.keys.set(key.keyId, key);
  }

  async findByKeyId(keyId: string): Promise<StoredApiKey | undefined> {
    return this.keys.get(keyId);
  }
}

// ── Deps ──────────────────────────────────────────────────────────────────────

export interface Deps {
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly metrics: MetricsRegistry;
  readonly healthChecks: readonly HealthCheck[];

  // Webhook subsystem
  readonly webhookRegistry: WebhookRegistry;
  readonly webhookSigner: WebhookSigner;
  readonly webhookVerifier: WebhookVerifier;
  readonly deliveryTracker: DeliveryTracker;

  // Auth subsystem
  readonly authenticator: Authenticator;
}

export function buildContainer(config: AppConfig): Deps {
  const logger = createLogger({ level: config.logLevel, bindings: { service: "webhook-gateway" } });
  const metrics = new MetricsRegistry();

  // Webhook stores
  const subscriptionStore = new InMemorySubscriptionStore();
  const deliveryStore = new InMemoryDeliveryStore();

  // Webhook services
  const webhookRegistry = new WebhookRegistry(subscriptionStore);
  const webhookSigner = new WebhookSigner({ secret: config.webhookSigningSecret });
  const webhookVerifier = new WebhookVerifier({ maxAgeMs: config.signatureMaxAgeMs });
  const retryPolicy = createRetryPolicy({ ...DEFAULT_RETRY_POLICY });
  const deliveryTracker = new DeliveryTracker(deliveryStore, retryPolicy);

  // Auth services
  const apiKeyStore = new InMemoryApiKeyStore();
  const hasher = createApiKeyHasher();
  const authenticator = new ApiKeyAuthenticator(apiKeyStore, hasher);

  // Health checks
  const healthChecks: HealthCheck[] = [
    new AlwaysHealthyCheck("webhook-registry"),
    new AlwaysHealthyCheck("delivery-tracker"),
  ];

  logger.info("Container built", {
    env: config.nodeEnv,
    port: config.port,
    defaultOrg: config.defaultOrganizationId,
  });

  return {
    config,
    logger,
    metrics,
    healthChecks,
    webhookRegistry,
    webhookSigner,
    webhookVerifier,
    deliveryTracker,
    authenticator,
  };
}
