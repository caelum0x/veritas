// SagaStep: a named transactional unit with typed input, an execute action, and optional compensation.
import type { Result } from "@veritas/core";
import type { SagaContext } from "./context.js";

/** Retry policy attached to an individual step. */
export interface StepRetryPolicy {
  /** Maximum number of attempts including the first try. */
  readonly maxAttempts: number;
  /** Base back-off delay in milliseconds. */
  readonly baseDelayMs: number;
  /** Upper bound on back-off delay in milliseconds. */
  readonly maxDelayMs: number;
}

export const DEFAULT_STEP_RETRY: StepRetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 200,
  maxDelayMs: 5_000,
};

/**
 * A single step in a saga.
 * `TInput` is the saga-level input shared across all steps.
 * `TOutput` is the step's typed output; it must extend Record<string, unknown>
 * so the orchestrator can merge it into SagaContext.data.
 */
export interface SagaStep<TInput = unknown, TOutput extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique name within a saga definition. */
  readonly name: string;
  /**
   * Primary transactional action.
   * Returns a typed data record merged into SagaContext.data after the step completes.
   */
  execute(input: TInput, ctx: SagaContext): Promise<Result<TOutput>>;
  /**
   * Compensation to reverse this step's effects.
   * Called in reverse order when a later step fails.
   */
  compensate?(input: TInput, ctx: SagaContext): Promise<void>;
  /** Optional retry policy; defaults to DEFAULT_STEP_RETRY. */
  readonly retry?: StepRetryPolicy;
}
