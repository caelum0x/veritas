// Dependency container — instantiates and wires all package services into a Deps object.
import { createLogger } from "@veritas/observability";
import { MetricsRegistry } from "@veritas/observability";
import { AlwaysHealthyCheck } from "@veritas/observability";
import type { Logger, HealthCheck } from "@veritas/observability";
import { InMemoryReportStore, InMemoryReportTemplateStore, InMemoryReportScheduleStore } from "@veritas/reporting";
import type { ReportStore, ReportTemplateStore, ReportScheduleStore } from "@veritas/reporting";
import { ApiKeyAuthenticator, createApiKeyHasher } from "@veritas/auth";
import type { Authenticator, ApiKeyStore } from "@veritas/auth";
import { createAnalyticsStore } from "@veritas/analytics";
import { DefaultTracker } from "@veritas/analytics";
import type { AnalyticsStore, Tracker } from "@veritas/analytics";
import { TableCatalog } from "@veritas/warehouse";
import type { DataSourceRegistry } from "@veritas/query-engine";
import { ReportGenerateFlow } from "@veritas/flows-data";
import { UsageRollupFlow } from "@veritas/flows-data";
import { VerificationAnalyticsFlow } from "@veritas/flows-data";
import type { AnalyticsApiConfig } from "./config.js";
import { buildDashboardStore } from "./bootstrap.js";
import type { DashboardStore } from "./bootstrap.js";

/** In-memory API key store — replace with a DB-backed implementation for production. */
class InMemoryApiKeyStore implements ApiKeyStore {
  async findByKeyId(_keyId: string): Promise<undefined> {
    return undefined;
  }
}

/** Noop event bus — satisfies the EventBus port for flows-data flows. */
function makeNoopEventBus() {
  return {
    publish: async (_event: unknown): Promise<void> => undefined,
    subscribe: (_type: string, _handler: unknown): void => undefined,
  };
}

/** All runtime dependencies available to routes, controllers, and middleware. */
export interface Deps {
  readonly config: AnalyticsApiConfig;
  readonly logger: Logger;
  readonly metricsRegistry: MetricsRegistry;
  readonly healthChecks: readonly HealthCheck[];
  readonly registry: DataSourceRegistry;
  readonly reportStore: ReportStore;
  readonly templateStore: ReportTemplateStore;
  readonly scheduleStore: ReportScheduleStore;
  readonly analyticsStore: AnalyticsStore;
  readonly tracker: Tracker;
  readonly tableCatalog: TableCatalog;
  readonly authenticator: Authenticator;
  readonly dashboardStore: DashboardStore;
  readonly reportGenerateFlow: ReportGenerateFlow;
  readonly usageRollupFlow: UsageRollupFlow;
  readonly verificationAnalyticsFlow: VerificationAnalyticsFlow;
}

/** Build the complete dependency graph from validated config. */
export function buildContainer(config: AnalyticsApiConfig): Deps {
  const logger = createLogger({
    level: config.logLevel,
    bindings: { service: "analytics-api", env: config.env },
  });

  const metricsRegistry = new MetricsRegistry();
  const eventBus = makeNoopEventBus();

  const registry: DataSourceRegistry = new Map();
  const reportStore = new InMemoryReportStore();
  const templateStore = new InMemoryReportTemplateStore();
  const scheduleStore = new InMemoryReportScheduleStore();

  const analyticsStore = createAnalyticsStore({ maxEvents: 500_000, ttlMs: 30 * 24 * 60 * 60 * 1000 });
  const tracker = new DefaultTracker({ store: analyticsStore, logger, batchSize: 50, flushIntervalMs: 5_000 });

  const tableCatalog = new TableCatalog();
  tableCatalog.registerSchema("analytics");
  tableCatalog.registerSchema("reporting");

  const hasher = createApiKeyHasher();
  const authenticator = new ApiKeyAuthenticator(new InMemoryApiKeyStore(), hasher);

  const dashboardStore = buildDashboardStore();

  const reportGenerateFlow = new ReportGenerateFlow({
    reportStore,
    deliveryChannels: [],
    logger,
    eventBus,
  });

  const noopWarehousePort = {
    load: async (_table: unknown, _rows: unknown[]): Promise<{ loaded: number; failed: number; errors: string[] }> =>
      ({ loaded: 0, failed: 0, errors: [] }),
    query: async (_table: unknown, _opts?: unknown): Promise<{ rows: unknown[]; total: number }> =>
      ({ rows: [], total: 0 }),
  };

  const usageRollupFlow = new UsageRollupFlow({
    analyticsStore,
    warehouse: noopWarehousePort,
    logger,
    eventBus,
  });

  const verificationAnalyticsFlow = new VerificationAnalyticsFlow({
    reportStore,
    analyticsStore,
    logger,
    eventBus,
  });

  const healthChecks: readonly HealthCheck[] = [
    new AlwaysHealthyCheck("analytics-store"),
    new AlwaysHealthyCheck("report-store"),
  ];

  logger.info("analytics-api container built");

  return Object.freeze({
    config,
    logger,
    metricsRegistry,
    healthChecks,
    registry,
    reportStore,
    templateStore,
    scheduleStore,
    analyticsStore,
    tracker,
    tableCatalog,
    authenticator,
    dashboardStore,
    reportGenerateFlow,
    usageRollupFlow,
    verificationAnalyticsFlow,
  });
}
