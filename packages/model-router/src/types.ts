// Core types for model-router: task descriptors, routing context, and routing decisions
import type { Result } from "@veritas/core";
import type { AppError } from "@veritas/core";
import type { VerifierLLM } from "@veritas/llm";

/** Broad categories of tasks the router understands */
export type TaskKind =
  | "extract-claims"
  | "research"
  | "adjudicate"
  | "summarize"
  | "classify"
  | "general";

/** Quality tier preference for model selection */
export type QualityTier = "economy" | "balanced" | "premium";

/** A task submitted to the router for model selection */
export interface RoutingTask {
  readonly kind: TaskKind;
  /** Estimated input token count (helps cost-aware routing) */
  readonly estimatedInputTokens: number;
  /** Required quality tier; defaults to "balanced" if absent */
  readonly qualityTier?: QualityTier;
  /** Whether the task requires web-search capability */
  readonly requiresWebSearch?: boolean;
  /** Max budget in USD for this task (0 = unlimited) */
  readonly budgetUsd?: number;
  /** Arbitrary caller metadata propagated to the decision */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** The result of a routing decision */
export interface RoutingDecision {
  /** The selected provider */
  readonly provider: VerifierLLM;
  /** The specific model ID the provider should use */
  readonly modelId: string;
  /** Human-readable rationale for the selection */
  readonly rationale: string;
  /** Estimated cost in USD for this task */
  readonly estimatedCostUsd: number;
}

/** A single entry in a fallback chain */
export interface FallbackEntry {
  readonly provider: VerifierLLM;
  readonly modelId: string;
}

/** Port interface for any routing strategy */
export interface RoutingStrategy {
  readonly name: string;
  select(task: RoutingTask): Result<RoutingDecision, AppError>;
}
