// Dependency container: instantiates all package services/flows/repositories and wires them together.
import type { Logger } from "@veritas/observability";
import {
  createLogger,
  MetricsRegistry,
  AlwaysHealthyCheck,
  runHealthChecks,
  makeHealthCheck,
} from "@veritas/observability";
import type { TaxonomyRegistry } from "@veritas/taxonomy";
import type { HealthCheck } from "@veritas/observability";
import { globalTaxonomyRegistry, LLMClassifier, MockClassifierLLMPort } from "@veritas/taxonomy";
import {
  runVerification,
  composePipeline,
  normalizeStage,
  resolveClaimsStage,
  dedupeClaimsStage,
  scoreStage,
  assembleStage,
  computeTrustScore,
  buildReport,
  rankSources,
} from "@veritas/verification";
import {
  VerifierCache,
  aggregateSignals,
  makeEvidenceBundle,
  makeVerifierContext,
  makeVerdictSignal,
  MockDataSource,
} from "@veritas/verifier-kit";
import type { AppConfig } from "./config.js";

export interface Deps {
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly metrics: MetricsRegistry;
  readonly taxonomyRegistry: TaxonomyRegistry;
  readonly llmClassifier: LLMClassifier;
  readonly verifierCache: VerifierCache;
  readonly healthChecks: readonly HealthCheck[];
  readonly runVerification: typeof runVerification;
  readonly composePipeline: typeof composePipeline;
  readonly normalizeStage: typeof normalizeStage;
  readonly resolveClaimsStage: typeof resolveClaimsStage;
  readonly dedupeClaimsStage: typeof dedupeClaimsStage;
  readonly scoreStage: typeof scoreStage;
  readonly assembleStage: typeof assembleStage;
  readonly computeTrustScore: typeof computeTrustScore;
  readonly buildReport: typeof buildReport;
  readonly rankSources: typeof rankSources;
  readonly aggregateSignals: typeof aggregateSignals;
  readonly makeEvidenceBundle: typeof makeEvidenceBundle;
  readonly makeVerifierContext: typeof makeVerifierContext;
  readonly makeVerdictSignal: typeof makeVerdictSignal;
}

export function buildContainer(config: AppConfig): Deps {
  const logger = createLogger({
    level: config.logLevel,
    bindings: { service: "domain-router", version: config.verifierVersion },
  });

  const metrics = new MetricsRegistry();

  // Taxonomy setup: use the global registry as the canonical registry.
  const taxonomyRegistry = globalTaxonomyRegistry;

  // LLM classifier: uses mock port in development (replace with real LLM adapter).
  const classifierLLMPort = new MockClassifierLLMPort();
  const llmClassifier = new LLMClassifier(classifierLLMPort);

  // Verifier cache with a 5-minute TTL.
  const verifierCache = new VerifierCache({ defaultTtlMs: 5 * 60 * 1000, maxSize: 1000 });

  const healthChecks: HealthCheck[] = [
    new AlwaysHealthyCheck("self"),
    makeHealthCheck(
      "taxonomy-registry",
      async () => taxonomyRegistry.nodeCount >= 0,
    ),
    makeHealthCheck(
      "verifier-cache",
      async () => true,
    ),
  ];

  return {
    config,
    logger,
    metrics,
    taxonomyRegistry,
    llmClassifier,
    verifierCache,
    healthChecks,
    runVerification,
    composePipeline,
    normalizeStage,
    resolveClaimsStage,
    dedupeClaimsStage,
    scoreStage,
    assembleStage,
    computeTrustScore,
    buildReport,
    rankSources,
    aggregateSignals,
    makeEvidenceBundle,
    makeVerifierContext,
    makeVerdictSignal,
  };
}
