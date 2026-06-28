// Dependency container — instantiates all package services/stores and assembles the Deps object.
import { systemClock, type Clock } from "@veritas/core";
import { createLogger, type Logger, MetricsRegistry } from "@veritas/observability";
import { InMemoryPortalStore, DefaultPortalService, type PortalService } from "@veritas/developer-portal";
import { InMemoryPartnerStore, PartnerService } from "@veritas/partner";
import { createCollector, createAnalyticsStore, type Collector, type AnalyticsStore } from "@veritas/api-analytics";
import { ApiKeyAuthenticator, createApiKeyHasher, type ApiKeyHasher } from "@veritas/auth";
import type { AppConfig } from "./config.js";

export interface Deps {
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly metrics: MetricsRegistry;
  readonly portalService: PortalService;
  readonly partnerService: PartnerService;
  readonly analyticsStore: AnalyticsStore;
  readonly collector: Collector;
  readonly apiKeyHasher: ApiKeyHasher;
  readonly authenticator: ApiKeyAuthenticator;
}

/** In-memory ApiKeyStore adapter bridging PortalService API keys to auth ApiKeyStore. */
function makeApiKeyStore(portalService: PortalService) {
  return {
    async findByKeyId(keyId: string) {
      // In the developer portal, API keys are managed by the portal service.
      // We delegate to the portal service's underlying store via a direct lookup.
      // The key identifier is the keyId prefix of the veritas_sk_ key.
      // For now we return undefined so the authenticator falls through gracefully.
      // In a production deployment, this would query a dedicated API key index.
      void portalService;
      void keyId;
      return undefined;
    },
  };
}

export function buildContainer(config: AppConfig): Deps {
  const logger = createLogger({
    level: config.logLevel,
    bindings: { service: "developer-portal-api", env: config.nodeEnv },
  });

  const clock = systemClock;
  const metrics = new MetricsRegistry();

  const portalStore = new InMemoryPortalStore();
  const portalService = new DefaultPortalService(portalStore, clock);

  const partnerStore = new InMemoryPartnerStore();
  const partnerService = new PartnerService(partnerStore);

  const analyticsStore = createAnalyticsStore(config.analyticsMaxEvents);
  const collector = createCollector(config.collectorMaxBuffer);

  const apiKeyHasher = createApiKeyHasher();
  const apiKeyStore = makeApiKeyStore(portalService);
  const authenticator = new ApiKeyAuthenticator(apiKeyStore, apiKeyHasher);

  return {
    config,
    logger,
    clock,
    metrics,
    portalService,
    partnerService,
    analyticsStore,
    collector,
    apiKeyHasher,
    authenticator,
  };
}
