// Dependency container — wires all package services/flows/providers into a single Deps object.

import {
  createLogger,
  MetricsRegistry,
  AlwaysHealthyCheck,
  type Logger,
  type HealthCheck,
} from "@veritas/observability";
import {
  agentCardBuilder,
  headerApiKeyAuth,
  noAuth,
  type AgentCard as BuilderAgentCard,
} from "@veritas/agent-card";
import {
  makeAgentCard,
  type A2AAgentCard,
} from "@veritas/a2a-protocol";
import {
  makeCapMetrics,
  makeMetricsRecorder,
  DEFAULT_POLICY_CONFIG,
  type NegotiationPolicyConfig,
  type MetricsRecorder,
  type CapMetrics,
} from "@veritas/cap";
import {
  runVerification,
  type EngineOptions,
} from "@veritas/verification";
import type { AppConfig } from "./config.js";

export interface Deps {
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly metricsRegistry: MetricsRegistry;
  readonly capMetricsRecorder: MetricsRecorder;
  readonly capPolicyConfig: NegotiationPolicyConfig;
  readonly builderAgentCard: BuilderAgentCard;
  readonly a2aAgentCard: A2AAgentCard;
  readonly runVerification: typeof runVerification;
  readonly healthChecks: readonly HealthCheck[];
}

/** Instantiate all services and wire them into a Deps object. */
export function buildContainer(config: AppConfig): Deps {
  const logger = createLogger({
    level: config.logLevel,
    bindings: { service: "agent-gateway", env: config.nodeEnv },
  });

  const metricsRegistry = new MetricsRegistry();

  const capMetricsRecorder = makeMetricsRecorder(logger.child({ module: "cap" }));

  const capPolicyConfig: NegotiationPolicyConfig = {
    ...DEFAULT_POLICY_CONFIG,
    minAmountUsdc: config.capMinAmountUsdc,
    maxClaims: config.capMaxClaims,
  };

  // Build the @veritas/agent-card AgentCard via the fluent builder
  const cardResult = agentCardBuilder()
    .withId(config.agentId)
    .withName(config.agentName)
    .withDescription(
      "Enterprise fact-verification and source-provenance platform. " +
        "Submit text for claim extraction, research, and verdicts backed by cited evidence."
    )
    .withVersion(config.agentVersion)
    .withProtocolVersion("1.0")
    .withMaturity("stable")
    .withRuntime("cloud")
    .withUrl(config.agentBaseUrl)
    .withContact({ name: "Veritas Team", email: "ops@veritas.croo.ai" })
    .withDefaultAuth(headerApiKeyAuth(config.apiKeyHeader, "API key for authenticated endpoints"))
    .addEndpoint({
      name: "a2a",
      url: `${config.agentBaseUrl}/a2a`,
      protocol: "https",
      auth: headerApiKeyAuth(config.apiKeyHeader),
      description: "A2A task submission and management",
    })
    .addEndpoint({
      name: "agent-card",
      url: `${config.agentBaseUrl}/agent-card`,
      protocol: "https",
      auth: { type: "none" as const },
      description: "Agent card discovery endpoint",
    })
    .addEndpoint({
      name: "health",
      url: `${config.agentBaseUrl}/health`,
      protocol: "https",
      auth: { type: "none" as const },
      description: "Liveness and readiness probes",
    })
    .build();

  if (!cardResult.ok) {
    throw cardResult.error;
  }

  const builderAgentCard = cardResult.value;

  // Build the @veritas/a2a-protocol A2AAgentCard for inter-agent communication
  const a2aAgentCard: A2AAgentCard = makeAgentCard({
    agentId: config.agentId,
    name: config.agentName,
    description:
      "Enterprise fact-verification platform — claim extraction, research, adjudication.",
    endpoint: `${config.agentBaseUrl}/a2a`,
    protocolVersion: config.a2aProtocolVersion,
    capabilities: [
      {
        id: "verify-text",
        name: "Verify Text",
        description: "Extract claims from free text and verify each against evidence sources.",
        inputSchema: {
          type: "object",
          properties: {
            text: { type: "string" },
            effort: { type: "string", enum: ["low", "standard", "high"] },
          },
          required: ["text"],
        },
      },
      {
        id: "verify-claims",
        name: "Verify Claims",
        description: "Verify a list of explicit claims against evidence sources.",
        inputSchema: {
          type: "object",
          properties: {
            claims: { type: "array", items: { type: "string" } },
          },
          required: ["claims"],
        },
      },
    ],
    authMethods: ["api-key"],
    updatedAt: new Date().toISOString(),
  });

  const healthChecks: readonly HealthCheck[] = [
    new AlwaysHealthyCheck("agent-gateway"),
  ];

  logger.info("container: built", {
    agentId: config.agentId,
    agentBaseUrl: config.agentBaseUrl,
    capEndpoint: config.capEndpoint,
  });

  return {
    config,
    logger,
    metricsRegistry,
    capMetricsRecorder,
    capPolicyConfig,
    builderAgentCard,
    a2aAgentCard,
    runVerification,
    healthChecks,
  };
}
