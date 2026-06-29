// Dependency container — wires all package services/flows/providers into a single Deps object.

import {
  createLogger,
  MetricsRegistry,
  AlwaysHealthyCheck,
  type Logger,
  type HealthCheck,
} from "@veritas/observability";
import {
  headerApiKeyAuth,
  noAuth,
  makeAgentCard,
  makeSkill,
  makeCapability,
  makeEndpoint,
  type AgentCard,
} from "@veritas/agent-card";
import {
  makeAgentCard as makeA2AAgentCard,
  type A2AAgentCard,
  type CapBridgeConfig,
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
import { AnthropicProvider } from "@veritas/llm";
import type { AppConfig } from "./config.js";
import type { AgentCardConfig } from "./features/agent-card/agent-card.service.js";

export interface Deps {
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly metricsRegistry: MetricsRegistry;
  readonly capMetricsRecorder: MetricsRecorder;
  readonly capPolicyConfig: NegotiationPolicyConfig;
  readonly a2aAgentCard: A2AAgentCard;
  readonly runVerification: typeof runVerification;
  readonly healthChecks: readonly HealthCheck[];
  readonly engineOptions: EngineOptions;
  readonly capBridgeConfig: CapBridgeConfig;
  readonly agentCardConfig: AgentCardConfig;
  readonly registryCard: AgentCard;
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

  // Build the @veritas/a2a-protocol A2AAgentCard for inter-agent communication
  const a2aAgentCard: A2AAgentCard = makeA2AAgentCard({
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

  // Build the CAP bridge config using the a2a agent card
  const capBridgeConfig: CapBridgeConfig = {
    selfCard: a2aAgentCard,
    maxBudgetUsdc: config.capMaxBudgetUsdc,
    capEndpoint: config.capEndpoint,
  };

  // Build the LLM provider and engine options
  const llm = new AnthropicProvider({
    apiKey: config.anthropicApiKey,
    baseUrl: "https://api.anthropic.com",
    model: config.anthropicModel,
    fastModel: config.anthropicFastModel,
    maxTokens: config.anthropicMaxTokens,
    temperature: 0.2,
    concurrency: config.anthropicConcurrency,
    timeoutMs: 120_000,
    maxRetries: 3,
    promptCaching: true,
  });

  const engineOptions: EngineOptions = {
    llm,
    logger: logger.child({ module: "verification" }),
    concurrency: config.verificationConcurrency,
    maxClaims: config.verificationMaxClaims,
  };

  // Build the agent card config for the agent-card feature
  const agentCardConfig: AgentCardConfig = {
    agentId: config.agentId,
    name: config.agentName,
    description:
      "Enterprise fact-verification and source-provenance platform. " +
        "Submit text for claim extraction, research, and verdicts backed by cited evidence.",
    version: config.agentVersion,
    publicUrl: config.agentBaseUrl,
    contactEmail: "ops@veritas.croo.ai",
  };

  // Build the registry-format agent card (full AgentCard with skills and capabilities)
  const registryCard: AgentCard = makeAgentCard({
    schemaVersion: "1.0",
    id: config.agentId,
    name: config.agentName,
    description:
      "Enterprise fact-verification and source-provenance platform. " +
        "Submit text for claim extraction, research, and verdicts backed by cited evidence.",
    version: config.agentVersion,
    url: config.agentBaseUrl,
    defaultAuth: [headerApiKeyAuth(config.apiKeyHeader, "API key for authenticated endpoints")],
    endpoints: [
      makeEndpoint({
        name: "a2a",
        url: `${config.agentBaseUrl}/a2a`,
        protocol: "https",
        auth: headerApiKeyAuth(config.apiKeyHeader),
        description: "A2A task submission and management",
      }),
      makeEndpoint({
        name: "agent-card",
        url: `${config.agentBaseUrl}/agent-card`,
        protocol: "https",
        auth: noAuth(),
        description: "Agent card discovery endpoint",
      }),
      makeEndpoint({
        name: "health",
        url: `${config.agentBaseUrl}/health`,
        protocol: "https",
        auth: noAuth(),
        description: "Liveness and readiness probes",
      }),
    ],
    skills: [
      makeSkill({
        id: "verify-text",
        name: "Verify Text",
        description: "Extract claims from free text and verify each against evidence sources.",
        version: config.agentVersion,
        inputModes: ["text"],
        outputModes: ["json"],
        endpointName: "a2a",
      }),
      makeSkill({
        id: "verify-claims",
        name: "Verify Claims",
        description: "Verify a list of explicit claims against evidence sources.",
        version: config.agentVersion,
        inputModes: ["json"],
        outputModes: ["json"],
        endpointName: "a2a",
      }),
    ],
    capabilities: [
      makeCapability({
        id: "fact-verification",
        name: "Fact Verification",
        description: "Claim extraction, research, and adjudication with cited evidence.",
        kind: "verification",
        skillIds: ["verify-text", "verify-claims"],
      }),
    ],
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
    a2aAgentCard,
    runVerification,
    healthChecks,
    engineOptions,
    capBridgeConfig,
    agentCardConfig,
    registryCard,
  };
}
