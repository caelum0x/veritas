// Saga: a named, ordered sequence of typed steps that form a distributed transaction.
import type { Result } from "@veritas/core";
import type { SagaStep } from "./step.js";

/** A saga definition: immutable descriptor for an orchestrated multi-step workflow. */
export interface Saga<TInput = unknown, TOutput = unknown> {
  /** Unique saga name used as the discriminant in state storage. */
  readonly name: string;
  /** Ordered steps; compensation runs in reverse on failure. */
  readonly steps: readonly SagaStep<TInput>[];
  /**
   * Build the typed output from the saga input and accumulated step data.
   * Called once all steps complete successfully.
   */
  readonly buildOutput: (
    input: TInput,
    data: Readonly<Record<string, unknown>>,
  ) => Result<TOutput>;
}

/** Convenience alias for a saga with erased generics (used in the orchestrator). */
export type AnySaga = Saga<unknown, unknown>;

/** Extract the ordered step names from a saga definition. */
export function stepNamesOf(saga: AnySaga): readonly string[] {
  return saga.steps.map((s) => s.name);
}
