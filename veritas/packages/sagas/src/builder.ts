// SagaBuilder: fluent DSL for assembling a Saga definition from named steps.

import type { Result } from "@veritas/core";
import type { Saga } from "./saga.js";
import type { SagaStep, StepRetryPolicy } from "./step.js";
import { DEFAULT_STEP_RETRY } from "./step.js";
import type { SagaContext } from "./context.js";

/** Type of a step's execute function compatible with the new SagaStep interface. */
type ExecuteFn<TInput = unknown> = (
  input: TInput,
  ctx: SagaContext,
) => Promise<Result<Record<string, unknown>>>;

/** Type of a step's optional compensate function. */
type CompensateFn<TInput = unknown> = (input: TInput, ctx: SagaContext) => Promise<void>;

/** Internal descriptor for a step pending finalization. */
interface PendingStep<TInput = unknown> {
  readonly name: string;
  readonly execute: ExecuteFn<TInput>;
  readonly compensate?: CompensateFn<TInput>;
  readonly retry?: StepRetryPolicy;
}

/**
 * Fluent builder for SagaDefinition.
 * Call .step() for each ordered step, then .build() to produce the definition.
 * Steps execute in insertion order; compensations run in reverse on failure.
 */
export class SagaBuilder<TInput = unknown, TOutput = void> {
  private readonly _name: string;
  private readonly _steps: PendingStep<TInput>[] = [];
  private _buildOutput?: (input: TInput, data: Readonly<Record<string, unknown>>) => Result<TOutput>;

  private constructor(name: string) {
    this._name = name;
  }

  /** Start building a new saga with the given name. */
  static create<TInput = unknown, TOutput = unknown>(
    name: string,
  ): SagaBuilder<TInput, TOutput> {
    return new SagaBuilder<TInput, TOutput>(name);
  }

  /**
   * Append a step to the saga.
   * `execute` receives the shared saga input and current context; returns partial data merged into ctx.
   * `compensate` is called in reverse order if a later step fails.
   */
  step(
    name: string,
    execute: ExecuteFn<TInput>,
    opts?: {
      readonly compensate?: CompensateFn<TInput>;
      readonly retry?: StepRetryPolicy;
    },
  ): this {
    this._steps.push({
      name,
      execute,
      compensate: opts?.compensate,
      retry: opts?.retry ?? DEFAULT_STEP_RETRY,
    });
    return this;
  }

  /**
   * Provide a function that builds the typed output from saga input and accumulated step data.
   * Required because Saga.buildOutput returns Result<TOutput>.
   */
  output(
    fn: (input: TInput, data: Readonly<Record<string, unknown>>) => Result<TOutput>,
  ): this {
    this._buildOutput = fn;
    return this;
  }

  /** Produce the immutable Saga definition. Throws if no steps or output builder were added. */
  build(): Saga<TInput, TOutput> {
    if (this._steps.length === 0) {
      throw new Error(`SagaBuilder: saga "${this._name}" must have at least one step`);
    }
    if (!this._buildOutput) {
      throw new Error(`SagaBuilder: saga "${this._name}" must have an output builder (call .output())`);
    }

    const steps: readonly SagaStep<TInput>[] = this._steps.map((s) => ({
      name: s.name,
      execute: s.execute,
      compensate: s.compensate,
      retry: s.retry,
    }));

    const buildOutput = this._buildOutput;

    return {
      name: this._name,
      steps,
      buildOutput,
    };
  }
}
