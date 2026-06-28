// Dependency container: instantiates all package services/stores and wires them into Deps.
import {
  ApiKeyAuthenticator,
  createApiKeyHasher,
  type ApiKeyStore,
  type Authenticator,
} from "@veritas/auth";
import { IncidentService, InMemoryIncidentStore } from "@veritas/incident";
import {
  InMemorySloRepository,
  InMemorySloEvaluationRepository,
  InMemoryBurnAlertRepository,
  InMemorySloReportRepository,
  type SloRepository,
  type SloEvaluationRepository,
  type BurnAlertRepository,
  type SloReportRepository,
} from "@veritas/slo";
import {
  createInMemoryCostStore,
  InMemoryBudgetRepository,
  InMemoryAllocationRepository,
  InMemoryAlertRepository,
  InMemoryModelCostRepository,
  DEFAULT_MODEL_COSTS,
  createCostAggregator,
  createCostOptimizer,
  createCostReportBuilder,
  type CostStore,
} from "@veritas/cost";
import {
  InMemoryMetricSource,
  type MetricSource,
} from "@veritas/capacity";
import {
  createHealthCheck,
  type HealthCheck,
} from "@veritas/health-aggregation";
import {
  createLogger,
  MetricsRegistry,
  type Logger,
} from "@veritas/observability";
import { systemClock, type Clock } from "@veritas/core";
import type { AppConfig } from "./config.js";

/** In-memory API key store seeded with the configured internal secret. */
function buildApiKeyStore(secret: string): ApiKeyStore {
  const hasher = createApiKeyHasher();
  const raw = `veritas_sk_ops-dev_${secret}`;
  const hashed = hasher.hash({ raw, keyId: "ops-dev", secret, prefix: "veritas_sk_" });
  const record = {
    keyId: "ops-dev",
    hashedSecret: hashed.hash,
    salt: hashed.salt,
    organizationId: "internal",
    userId: undefined as string | undefined,
    scopes: ["ops:read", "ops:write"] as ReadonlyArray<string>,
    allowedIps: undefined as ReadonlyArray<string> | undefined,
    revokedAt: undefined as string | undefined,
  };
  const store = new Map([["ops-dev", record]]);
  return { findByKeyId: async (id: string) => store.get(id) };
}

export interface Deps {
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly metricsRegistry: MetricsRegistry;
  readonly authenticator: Authenticator;
  readonly incidentService: IncidentService;
  readonly sloRepo: SloRepository;
  readonly sloEvalRepo: SloEvaluationRepository;
  readonly burnAlertRepo: BurnAlertRepository;
  readonly sloReportRepo: SloReportRepository;
  readonly costStore: CostStore;
  readonly costAggregator: ReturnType<typeof createCostAggregator>;
  readonly costOptimizer: ReturnType<typeof createCostOptimizer>;
  readonly costReportBuilder: ReturnType<typeof createCostReportBuilder>;
  readonly budgetRepo: InstanceType<typeof InMemoryBudgetRepository>;
  readonly allocationRepo: InstanceType<typeof InMemoryAllocationRepository>;
  readonly alertRepo: InstanceType<typeof InMemoryAlertRepository>;
  readonly modelCostRepo: InstanceType<typeof InMemoryModelCostRepository>;
  readonly metricSource: MetricSource;
  readonly healthChecks: readonly HealthCheck[];
}

export function buildContainer(config: AppConfig): Deps {
  const logger = createLogger({ level: config.log.level, bindings: { service: "ops-api" } });
  const clock = systemClock;
  const metricsRegistry = new MetricsRegistry();

  // Incident
  const incidentStore = new InMemoryIncidentStore();
  const incidentService = new IncidentService(incidentStore);

  // SLO
  const sloRepo = new InMemorySloRepository();
  const sloEvalRepo = new InMemorySloEvaluationRepository();
  const burnAlertRepo = new InMemoryBurnAlertRepository();
  const sloReportRepo = new InMemorySloReportRepository();

  // Cost
  const costStore = createInMemoryCostStore();
  const budgetRepo = new InMemoryBudgetRepository();
  const allocationRepo = new InMemoryAllocationRepository();
  const alertRepo = new InMemoryAlertRepository();
  const modelCostRepo = new InMemoryModelCostRepository();

  for (const cfg of DEFAULT_MODEL_COSTS) {
    modelCostRepo.save(cfg).catch(() => undefined);
  }

  const costAggregator = createCostAggregator(costStore);
  const costOptimizer = createCostOptimizer({});
  const costReportBuilder = createCostReportBuilder();

  // Capacity
  const metricSource = new InMemoryMetricSource([]);

  // Auth
  const apiKeyStore = buildApiKeyStore(config.auth.internalApiSecret);
  const hasher = createApiKeyHasher();
  const authenticator = new ApiKeyAuthenticator(apiKeyStore, hasher);

  // Health checks
  const healthChecks: HealthCheck[] = [
    createHealthCheck({
      name: "self",
      probe: async () => "healthy",
    }),
  ];

  return {
    config,
    logger,
    clock,
    metricsRegistry,
    authenticator,
    incidentService,
    sloRepo,
    sloEvalRepo,
    burnAlertRepo,
    sloReportRepo,
    costStore,
    costAggregator,
    costOptimizer,
    costReportBuilder,
    budgetRepo,
    allocationRepo,
    alertRepo,
    modelCostRepo,
    metricSource,
    healthChecks,
  };
}
