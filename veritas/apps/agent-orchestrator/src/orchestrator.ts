// Orchestrator: composes multi-agent verification pipelines from plan, routing, and execution.

import { ok, err, noopLogger, epochToIso } from "@veritas/core";
import type { Result, AppError, Logger } from "@veritas/core";
import type { VerificationReport } from "@veritas/contracts";
import { CAPAgentClient } from "./cap-agent-client.js";
import { AgentRegistry } from "./registry.js";
import type { RegistryEntry } from "./registry.js";
import { buildPlan } from "./plan.js";
import { runPipeline } from "./pipeline.js";
import type { AgentResolver, PipelineRunOptions } from "./pipeline.js";
import type { OrchestratorConfig } from "./config.js";
import type { EffortLevel, OrchestratorSummary, PipelineResult, StrategyKind } from "./types.js";
import { routeClaim } from "./router.js";
import { NoAgentFoundError } from "./errors.js";

/** Input for a single orchestration run. */
export interface OrchestrationRequest {
  readonly claimId: string;
  readonly claimText: string;
  readonly effort: EffortLevel;
  readonly strategy?: StrategyKind;
  /** Named logical steps to execute; defaults to ["verify"]. */
  readonly stepNames?: readonly string[];
}

/** Full result of an orchestration run. */
export interface OrchestrationResult {
  readonly claimId: string;
  readonly pipeline: PipelineResult;
  readonly summary: OrchestratorSummary;
}

/** Core orchestrator: wires plan, routing, and pipeline execution together. */
export class Orchestrator {
  private readonly registry: AgentRegistry;
  private readonly client: CAPAgentClient;
  private readonly config: OrchestratorConfig;
  private readonly logger: Logger;

  constructor(
    registry: AgentRegistry,
    client: CAPAgentClient,
    config: OrchestratorConfig,
    logger: Logger = noopLogger,
  ) {
    this.registry = registry;
    this.client = client;
    this.config = config;
    this.logger = logger;
  }

  /** Run a full verification orchestration for the given request. */
  async run(request: OrchestrationRequest): Promise<Result<OrchestrationResult, AppError>> {
    const { claimId, claimText, effort, strategy } = request;
    const stepNames = request.stepNames ?? ["verify"];
    const chosenStrategy: StrategyKind = strategy ?? this.config.defaultStrategy;
    const startMs = Date.now();

    this.logger.info("orchestrator: run started", { claimId, effort, strategy: chosenStrategy });

    const plan = buildPlan(
      { claimId, strategy: chosenStrategy, effortLevel: effort, stepNames },
      this.logger,
    );

    const resolver: AgentResolver = (stepName) => {
      const routeResult = routeClaim(claimText, this.registry, {
        agentsPerClaim: this.config.maxCandidates,
      });
      if (!routeResult.ok) {
        this.logger.warn("orchestrator: routing failed", { stepName, error: String(routeResult.error) });
        return [];
      }
      return routeResult.value.assignedAgents as readonly RegistryEntry[];
    };

    const pipelineOptions: PipelineRunOptions = {
      concurrency: this.config.globalConcurrency,
      stepTimeoutMs: this.config.agentTimeoutMs,
    };

    const pipelineResult = await runPipeline(
      plan,
      resolver,
      this.client,
      claimText,
      pipelineOptions,
      this.logger,
    );

    if (!pipelineResult.ok) {
      this.logger.error("orchestrator: pipeline failed", { claimId, error: String(pipelineResult.error) });
      return err(pipelineResult.error);
    }

    const totalDurationMs = Date.now() - startMs;
    const reports: VerificationReport[] = pipelineResult.value.steps
      .filter((s) => s.status === "succeeded" && s.report !== undefined)
      .map((s) => s.report as VerificationReport);

    const summary: OrchestratorSummary = {
      reports,
      contributingAgents: reports.length,
      agreementRate: 1,
      completedAt: epochToIso(Date.now()),
      totalDurationMs,
    };

    this.logger.info("orchestrator: run completed", {
      claimId,
      totalDurationMs,
      contributingAgents: summary.contributingAgents,
    });

    return ok({ claimId, pipeline: pipelineResult.value, summary });
  }
}

/** Factory: create an Orchestrator with sensible defaults. */
export function createOrchestrator(
  registry: AgentRegistry,
  client: CAPAgentClient,
  config: OrchestratorConfig,
  logger?: Logger,
): Orchestrator {
  return new Orchestrator(registry, client, config, logger ?? noopLogger);
}
