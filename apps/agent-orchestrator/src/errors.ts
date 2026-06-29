// errors: domain-specific error classes for the agent-orchestrator module.

import { AppError } from "@veritas/core";
import type { AppErrorOptions } from "@veritas/core";

/** Raised when no suitable agent could be found in the registry for a claim. */
export class NoAgentFoundError extends AppError {
  readonly claimType?: string;

  constructor(options: AppErrorOptions & { readonly claimType?: string } = {}) {
    super("INTERNAL", 500, "No suitable agent found for claim", options);
    this.name = "NoAgentFoundError";
    this.claimType = options.claimType;
  }
}

/** Raised when consensus threshold is not met after aggregating verdicts. */
export class ConsensusNotReachedError extends AppError {
  readonly agreementRate: number;
  readonly requiredRate: number;

  constructor(
    options: AppErrorOptions & { readonly agreementRate: number; readonly requiredRate: number },
  ) {
    super(
      "INTERNAL",
      500,
      `Consensus not reached: agreement ${options.agreementRate.toFixed(2)} < required ${options.requiredRate.toFixed(2)}`,
      options,
    );
    this.name = "ConsensusNotReachedError";
    this.agreementRate = options.agreementRate;
    this.requiredRate = options.requiredRate;
  }
}

/** Raised when an orchestration pipeline step fails unrecoverably. */
export class PipelineStepError extends AppError {
  readonly stepName: string;

  constructor(options: AppErrorOptions & { readonly stepName: string }) {
    super("INTERNAL", 500, `Pipeline step failed: ${options.stepName}`, options);
    this.name = "PipelineStepError";
    this.stepName = options.stepName;
  }
}

/** Raised when an agent exceeds its allowed execution time. */
export class AgentTimeoutError extends AppError {
  readonly agentId: string;
  readonly timeoutMs: number;

  constructor(options: AppErrorOptions & { readonly agentId: string; readonly timeoutMs: number }) {
    super(
      "UNAVAILABLE",
      503,
      `Agent ${options.agentId} timed out after ${options.timeoutMs}ms`,
      options,
    );
    this.name = "AgentTimeoutError";
    this.agentId = options.agentId;
    this.timeoutMs = options.timeoutMs;
  }
}

/** Raised when an execution plan cannot be built for the given claim context. */
export class PlanBuildError extends AppError {
  constructor(options: AppErrorOptions = {}) {
    super("INTERNAL", 500, "Failed to build execution plan", options);
    this.name = "PlanBuildError";
  }
}

/** Raised when all fan-out dispatches fail and no agent produced a result. */
export class AllAgentsFailedError extends AppError {
  readonly attemptedCount: number;

  constructor(options: AppErrorOptions & { readonly attemptedCount: number }) {
    super(
      "INTERNAL",
      500,
      `All ${options.attemptedCount} agent(s) failed to produce a result`,
      options,
    );
    this.name = "AllAgentsFailedError";
    this.attemptedCount = options.attemptedCount;
  }
}
