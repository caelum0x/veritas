// Orchestrator configuration: zod schema, defaults, and environment loading for the agent-orchestrator.

import { z } from "zod";

/** Strategy used to route verification tasks across available agents. */
export const RoutingStrategySchema = z.enum(["fan-out", "cheapest-first", "escalate"]);
export type RoutingStrategy = z.infer<typeof RoutingStrategySchema>;

/** Zod schema for orchestrator-specific runtime configuration. */
export const OrchestratorConfigSchema = z.object({
  /** Default routing strategy applied when no claim-specific override is set. */
  defaultStrategy: RoutingStrategySchema.default("cheapest-first"),

  /** Maximum number of candidate agents to consider per routing decision. */
  maxCandidates: z.number().int().min(1).max(50).default(10),

  /** Maximum concurrent agent dispatches across all active pipelines. */
  globalConcurrency: z.number().int().min(1).max(100).default(16),

  /** Per-agent dispatch timeout in milliseconds. */
  agentTimeoutMs: z.number().int().positive().default(60_000),

  /** Minimum confidence score below which escalation is triggered (escalate strategy). */
  escalationThreshold: z.number().min(0).max(1).default(0.7),

  /** Maximum number of escalation tiers to attempt. */
  maxEscalationTiers: z.number().int().min(1).max(5).default(3),

  /** How often (ms) the runtime supervisor logs a health snapshot. */
  healthLogIntervalMs: z.number().int().positive().default(60_000),

  /** Maximum top-level supervisor restart attempts before giving up. */
  maxSupervisorRestarts: z.number().int().min(0).default(3),

  /** Delay (ms) between supervisor restart attempts. */
  supervisorRestartDelayMs: z.number().int().positive().default(5_000),

  /** Whether to operate the orchestrator in dry-run mode (no real dispatches). */
  dryRun: z.boolean().default(false),
});

export type OrchestratorConfig = z.infer<typeof OrchestratorConfigSchema>;

/** Parse and validate orchestrator config from a raw input object. */
export function parseOrchestratorConfig(raw: unknown): OrchestratorConfig {
  return OrchestratorConfigSchema.parse(raw);
}

/** Resolve orchestrator config from environment variables with safe defaults. */
export function loadOrchestratorConfigFromEnv(): OrchestratorConfig {
  const raw: Record<string, unknown> = {};

  const defaultStrategy = process.env["ORCHESTRATOR_STRATEGY"];
  if (defaultStrategy !== undefined) raw["defaultStrategy"] = defaultStrategy;

  const maxCandidates = process.env["ORCHESTRATOR_MAX_CANDIDATES"];
  if (maxCandidates !== undefined) raw["maxCandidates"] = Number(maxCandidates);

  const globalConcurrency = process.env["ORCHESTRATOR_CONCURRENCY"];
  if (globalConcurrency !== undefined) raw["globalConcurrency"] = Number(globalConcurrency);

  const agentTimeoutMs = process.env["ORCHESTRATOR_AGENT_TIMEOUT_MS"];
  if (agentTimeoutMs !== undefined) raw["agentTimeoutMs"] = Number(agentTimeoutMs);

  const escalationThreshold = process.env["ORCHESTRATOR_ESCALATION_THRESHOLD"];
  if (escalationThreshold !== undefined) raw["escalationThreshold"] = Number(escalationThreshold);

  const maxEscalationTiers = process.env["ORCHESTRATOR_MAX_ESCALATION_TIERS"];
  if (maxEscalationTiers !== undefined) raw["maxEscalationTiers"] = Number(maxEscalationTiers);

  const healthLogIntervalMs = process.env["ORCHESTRATOR_HEALTH_LOG_INTERVAL_MS"];
  if (healthLogIntervalMs !== undefined) raw["healthLogIntervalMs"] = Number(healthLogIntervalMs);

  const dryRun = process.env["ORCHESTRATOR_DRY_RUN"];
  if (dryRun !== undefined) raw["dryRun"] = dryRun === "true" || dryRun === "1";

  return OrchestratorConfigSchema.parse(raw);
}

/** Default orchestrator configuration with all values resolved. */
export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig =
  OrchestratorConfigSchema.parse({});
