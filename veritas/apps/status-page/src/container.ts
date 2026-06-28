// Dependency injection container: instantiates and wires all package services.
import { systemClock, type Clock } from "@veritas/core";
import { createLogger, MetricsRegistry, type Logger } from "@veritas/observability";
import { InMemoryIncidentStore, IncidentService } from "@veritas/incident";
import {
  InMemorySloRepository,
  InMemorySloEvaluationRepository,
  InMemoryBurnAlertRepository,
  InMemorySloReportRepository,
  InMemorySliSource,
  type SloRepository,
  type SloEvaluationRepository,
  type BurnAlertRepository,
  type SloReportRepository,
} from "@veritas/slo";
import type { AppConfig } from "./config.js";

export interface Deps {
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly metrics: MetricsRegistry;
  readonly incidentStore: InMemoryIncidentStore;
  readonly incidentService: IncidentService;
  readonly sloRepository: SloRepository;
  readonly sloEvaluationRepository: SloEvaluationRepository;
  readonly burnAlertRepository: BurnAlertRepository;
  readonly sloReportRepository: SloReportRepository;
  readonly sliSource: InMemorySliSource;
}

export function buildContainer(config: AppConfig): Deps {
  const logger = createLogger({
    level: config.logLevel,
    bindings: {
      service: config.serviceName,
      version: config.version,
      env: config.nodeEnv,
    },
  });

  const clock: Clock = systemClock;
  const metrics = new MetricsRegistry();

  const incidentStore = new InMemoryIncidentStore();
  const incidentService = new IncidentService(incidentStore);

  const sloRepository = new InMemorySloRepository();
  const sloEvaluationRepository = new InMemorySloEvaluationRepository();
  const burnAlertRepository = new InMemoryBurnAlertRepository();
  const sloReportRepository = new InMemorySloReportRepository();
  const sliSource = new InMemorySliSource();

  return Object.freeze({
    config,
    logger,
    clock,
    metrics,
    incidentStore,
    incidentService,
    sloRepository,
    sloEvaluationRepository,
    burnAlertRepository,
    sloReportRepository,
    sliSource,
  });
}
