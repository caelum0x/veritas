// types: shared domain types for the agent-orchestrator module.

import type { Result, Score, IsoTimestamp } from "@veritas/core";
import type { VerificationReport, Agent } from "@veritas/contracts";

/** Effort level governs how many resources an agent invests in verification. */
export type EffortLevel = "low" | "standard" | "high";

/** Identifies which strategy to use when routing a claim. */
export type StrategyKind = "fan-out" | "cheapest-first" | "escalate";

/** A candidate agent selected by the router for a particular claim. */
export interface AgentCandidate {
  readonly agentId: string;
  readonly endpoint: string;
  readonly apiKey: string;
  readonly tier: "economy" | "standard" | "premium";
  readonly costUsdcBase: number;
  readonly capabilities: readonly string[];
  readonly agent?: Agent;
}

/**
 * Function signature for dispatching a claim to an agent.
 * Returns either a VerificationReport or an error.
 */
export type DispatchFn = (
  candidate: AgentCandidate,
  payload: unknown,
) => Promise<Result<VerificationReport, Error>>;

/** Options controlling fan-out behaviour. */
export interface FanOutOptions {
  /** Max concurrent in-flight agent calls (default 8). */
  readonly concurrency?: number;
  /** Per-agent wall-clock timeout in milliseconds. */
  readonly timeoutMs?: number;
}

/** Outcome of a single fan-out dispatch. */
export interface FanOutOutcome {
  readonly agent: AgentCandidate;
  readonly result: Result<VerificationReport, Error>;
}

/** Aggregated result from a fan-out run. */
export interface FanOutResult {
  readonly outcomes: readonly FanOutOutcome[];
  readonly successCount: number;
  readonly errorCount: number;
  readonly firstSuccess: FanOutOutcome | null;
}

/** Escalation level determines which tier of agents is tried next. */
export type EscalationLevel = "none" | "standard" | "premium" | "human";

/** Escalation policy attached to a pipeline or step. */
export interface EscalationPolicy {
  /** Minimum confidence below which escalation is triggered (0–1). */
  readonly confidenceThreshold: Score;
  /** Sequence of tiers to escalate through. */
  readonly levels: readonly EscalationLevel[];
  /** Maximum number of escalation attempts before giving up. */
  readonly maxAttempts: number;
}

/** A single named step in a verification pipeline. */
export interface PipelineStep {
  readonly name: string;
  readonly description?: string;
  /** Whether this step is required for the pipeline to succeed. */
  readonly required: boolean;
  readonly effortLevel: EffortLevel;
  readonly escalation?: EscalationPolicy;
}

/** An ordered execution plan produced by the planner. */
export interface ExecutionPlan {
  readonly planId: string;
  readonly claimId: string;
  readonly steps: readonly PipelineStep[];
  readonly createdAt: IsoTimestamp;
  readonly effortLevel: EffortLevel;
}

/** Runtime status of a single pipeline step execution. */
export type StepStatus = "pending" | "running" | "succeeded" | "failed" | "skipped";

/** Snapshot of a step's execution state. */
export interface StepState {
  readonly step: PipelineStep;
  readonly status: StepStatus;
  readonly startedAt?: IsoTimestamp;
  readonly completedAt?: IsoTimestamp;
  readonly report?: VerificationReport;
  readonly errorMessage?: string;
}

/** Overall pipeline execution result. */
export interface PipelineResult {
  readonly planId: string;
  readonly claimId: string;
  readonly finalReport: VerificationReport;
  readonly steps: readonly StepState[];
  readonly durationMs: number;
}

/** Summary produced by the orchestrator after all pipelines complete. */
export interface OrchestratorSummary {
  readonly reports: readonly VerificationReport[];
  readonly contributingAgents: number;
  readonly agreementRate: number;
  readonly completedAt: IsoTimestamp;
  readonly totalDurationMs: number;
}

/** Slim metadata attached to each step after execution. */
export interface StepMeta {
  readonly startedAt: IsoTimestamp;
  readonly finishedAt: IsoTimestamp;
  readonly durationMs: number;
  readonly agentId: string;
  readonly success: boolean;
  readonly errorMessage?: string;
}

/** Consensus configuration for multi-agent agreement. */
export interface ConsensusOptions {
  /** Fraction of agents that must agree (0–1, default 0.5). */
  readonly requiredAgreementRate?: number;
  /** Strategy for merging disagreements. */
  readonly mergeStrategy?: "weighted-mean" | "majority";
}

/** Result of a consensus evaluation. */
export interface ConsensusResult {
  readonly agreed: boolean;
  readonly agreementRate: number;
  readonly report: VerificationReport;
}
