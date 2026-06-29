// Builds and exports the Deps object by wiring all integrated packages.

import { createLogger } from "@veritas/observability";
import { MetricsRegistry } from "@veritas/observability";
import { AlwaysHealthyCheck, type HealthCheck } from "@veritas/observability";
import { noopAuditLogger, type AuditLogger } from "@veritas/observability";
import { createApiKeyHasher } from "@veritas/auth";
import { ApiKeyAuthenticator, type ApiKeyStore } from "@veritas/auth";
import { UsageMeter } from "@veritas/usage-billing";
import { Ledger } from "@veritas/billing";
import { DefaultTaxCalculator, type TaxCalculator } from "@veritas/tax";
import { createInMemoryDunningStore, type DunningStore } from "@veritas/dunning";
import { InMemoryPaymentStore, MockProcessor, type PaymentStore, type PaymentProcessor } from "@veritas/payments";
import { createRevenueStore, type RevenueStore } from "@veritas/revenue";
import type { Logger } from "@veritas/observability";
import type { Authenticator } from "@veritas/auth";
import type { AppConfig } from "./config.js";

/** In-memory API key store for the authenticator. */
function createInMemoryApiKeyStore(): ApiKeyStore {
  const keys = new Map<string, {
    keyId: string;
    hashedSecret: string;
    salt: string;
    organizationId: string;
    userId: string | undefined;
    scopes: ReadonlyArray<string>;
    allowedIps: ReadonlyArray<string> | undefined;
    revokedAt: string | undefined;
  }>();

  return {
    async findByKeyId(keyId: string) {
      return keys.get(keyId);
    },
  };
}

export interface Deps {
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly metrics: MetricsRegistry;
  readonly healthChecks: readonly HealthCheck[];
  readonly auditLogger: AuditLogger;

  // Auth
  readonly authenticator: Authenticator;
  readonly apiKeyStore: ApiKeyStore;

  // Billing
  readonly ledger: Ledger;
  readonly usageMeter: UsageMeter;

  // Tax
  readonly taxCalculator: TaxCalculator;

  // Dunning
  readonly dunningStore: DunningStore;

  // Payments
  readonly paymentStore: PaymentStore;
  readonly paymentProcessor: PaymentProcessor;

  // Revenue
  readonly revenueStore: RevenueStore;
}

export function buildContainer(config: AppConfig): Deps {
  const logger = createLogger({
    level: config.logLevel,
    bindings: {
      service: config.serviceName,
      version: config.serviceVersion,
      env: config.nodeEnv,
    },
  });

  const metrics = new MetricsRegistry();
  const auditLogger = noopAuditLogger;

  // Auth
  const apiKeyStore = createInMemoryApiKeyStore();
  const hasher = createApiKeyHasher();
  const authenticator = new ApiKeyAuthenticator(apiKeyStore, hasher);

  // Billing ledger (append-only)
  const ledger = new Ledger({ logger });

  // Usage metering
  const usageMeter = new UsageMeter({ logger });

  // Tax
  const taxCalculator = new DefaultTaxCalculator();

  // Dunning
  const dunningStore = createInMemoryDunningStore();

  // Payments
  const paymentStore = new InMemoryPaymentStore();
  const paymentProcessor: PaymentProcessor =
    config.paymentProcessorMode === "mock"
      ? new MockProcessor()
      : new MockProcessor(); // usdc-onchain would be wired here

  // Revenue analytics store
  const revenueStore = createRevenueStore();

  const healthChecks: HealthCheck[] = [
    new AlwaysHealthyCheck("billing-ledger"),
    new AlwaysHealthyCheck("usage-meter"),
    new AlwaysHealthyCheck("payment-store"),
    new AlwaysHealthyCheck("dunning-store"),
    new AlwaysHealthyCheck("revenue-store"),
  ];

  logger.info("container.built", {
    paymentProcessorMode: config.paymentProcessorMode,
    healthChecks: healthChecks.map((hc) => hc.name),
  });

  return {
    config,
    logger,
    metrics,
    healthChecks,
    auditLogger,
    authenticator,
    apiKeyStore,
    ledger,
    usageMeter,
    taxCalculator,
    dunningStore,
    paymentStore,
    paymentProcessor,
    revenueStore,
  };
}
