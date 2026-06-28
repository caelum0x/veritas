// Dependency container: instantiates all package services/flows/repos and wires them into Deps.

import { systemClock, InMemoryEventBus } from "@veritas/core";
import type { Clock, EventBus } from "@veritas/core";
import { InMemoryDsrStore, MockIdentityVerifier } from "@veritas/gdpr";
import type { DsrStore } from "@veritas/gdpr";
import type { Consent } from "@veritas/consent";
import {
  createPolicyRegistry,
  NoOpPurgeExecutor,
  type LegalHold,
} from "@veritas/retention";
import type { PolicyRegistry } from "@veritas/retention";
import { scanPayload, defaultPolicy } from "@veritas/dlp";
import type { DlpPolicy } from "@veritas/dlp";
import {
  ApiKeyAuthenticator,
  createApiKeyHasher,
} from "@veritas/auth";
import type { ApiKeyStore, Authenticator } from "@veritas/auth";
import {
  createLogger,
  MetricsRegistry,
  noopAuditLogger,
  AlwaysHealthyCheck,
  type Logger,
  type AuditLogger,
  type HealthCheck,
} from "@veritas/observability";
import type { AppConfig } from "./config.js";
import type { ConsentRepository } from "@veritas/flows-compliance";

/** In-memory consent repository satisfying the ConsentRepository port. */
function makeConsentRepository(): ConsentRepository {
  const store = new Map<string, Consent>();
  return {
    async save(consent: Consent): Promise<void> {
      store.set(consent.id, consent);
    },
    async findByUser(userId: string): Promise<readonly Consent[]> {
      return Array.from(store.values()).filter((c) => c.userId === userId);
    },
  };
}

/** Minimal in-memory API key store for local dev (no real persistence). */
function makeApiKeyStore(): ApiKeyStore {
  return {
    async findByKeyId(_keyId: string) {
      return undefined;
    },
  };
}

/** In-memory legal hold registry for the retention purge flow. */
function makeHoldRegistry(): { listActive(): Promise<readonly LegalHold[]> } {
  const holds: LegalHold[] = [];
  return {
    async listActive(): Promise<readonly LegalHold[]> {
      return holds.filter((h) => h.status === "active");
    },
  };
}

export interface Deps {
  readonly config: AppConfig;
  readonly clock: Clock;
  readonly logger: Logger;
  readonly eventBus: EventBus;
  readonly metricsRegistry: MetricsRegistry;
  readonly auditLogger: AuditLogger;
  readonly healthChecks: readonly HealthCheck[];

  // GDPR
  readonly dsrStore: DsrStore;
  readonly identityVerifier: MockIdentityVerifier;

  // Consent
  readonly consentRepo: ConsentRepository;

  // Retention
  readonly policyRegistry: PolicyRegistry;
  readonly holdRegistry: { listActive(): Promise<readonly LegalHold[]> };
  readonly purgeExecutor: NoOpPurgeExecutor;

  // DLP
  readonly scanPayload: typeof scanPayload;
  readonly defaultDlpPolicy: DlpPolicy;

  // Auth
  readonly authenticator: Authenticator;
}

export function buildContainer(config: AppConfig): Deps {
  const clock = systemClock;
  const logger = createLogger({
    level: config.logLevel,
    bindings: { service: "privacy-api", env: config.nodeEnv },
  });

  const eventBus = new InMemoryEventBus();
  const metricsRegistry = new MetricsRegistry();
  const auditLogger = noopAuditLogger;

  const dsrStore = new InMemoryDsrStore(clock);
  const identityVerifier = new MockIdentityVerifier();

  const consentRepo = makeConsentRepository();
  const policyRegistry = createPolicyRegistry();
  const holdRegistry = makeHoldRegistry();
  const purgeExecutor = new NoOpPurgeExecutor();

  const defaultDlpPolicy: DlpPolicy = defaultPolicy();

  const hasher = createApiKeyHasher();
  const apiKeyStore = makeApiKeyStore();
  const authenticator = new ApiKeyAuthenticator(apiKeyStore, hasher);

  const healthChecks: readonly HealthCheck[] = [
    new AlwaysHealthyCheck("api"),
    new AlwaysHealthyCheck("dsr-store"),
    new AlwaysHealthyCheck("consent-store"),
    new AlwaysHealthyCheck("retention-registry"),
  ];

  return {
    config,
    clock,
    logger,
    eventBus,
    metricsRegistry,
    auditLogger,
    healthChecks,
    dsrStore,
    identityVerifier,
    consentRepo,
    policyRegistry,
    holdRegistry,
    purgeExecutor,
    scanPayload,
    defaultDlpPolicy,
    authenticator,
  };
}
