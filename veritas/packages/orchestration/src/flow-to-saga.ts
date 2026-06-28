// Adapt application flow steps into saga step definitions for orchestration.
import { type Result, ok, err } from "@veritas/core";
import type { Saga, SagaStep, SagaContext } from "@veritas/sagas";

/** A single flow step that can be wrapped as a saga step. */
export interface FlowStep<TInput = unknown> {
  /** Unique name within the flow. */
  readonly name: string;
  /** Execute the flow step and return a record to merge into context data. */
  execute(input: TInput, ctx: SagaContext): Promise<Result<Record<string, unknown>>>;
  /** Optional compensation to reverse this step's effects. */
  compensate?(input: TInput, ctx: SagaContext): Promise<void>;
}

/** Options for constructing a saga from flow steps. */
export interface FlowToSagaOptions<TInput, TOutput> {
  readonly sagaName: string;
  readonly steps: readonly FlowStep<TInput>[];
  readonly buildOutput: (
    input: TInput,
    data: Readonly<Record<string, unknown>>
  ) => Result<TOutput>;
}

/**
 * Adapt an ordered list of flow steps into a Saga definition.
 * Each FlowStep is wrapped as a SagaStep; compensation is forwarded as-is.
 */
export function flowToSaga<TInput = unknown, TOutput = unknown>(
  opts: FlowToSagaOptions<TInput, TOutput>
): Saga<TInput, TOutput> {
  const steps: readonly SagaStep<TInput>[] = opts.steps.map((flowStep) =>
    adaptFlowStep(flowStep)
  );

  return {
    name: opts.sagaName,
    steps,
    buildOutput: opts.buildOutput,
  };
}

/** Wrap a single FlowStep as a SagaStep. */
function adaptFlowStep<TInput>(
  flowStep: FlowStep<TInput>
): SagaStep<TInput, Record<string, unknown>> {
  return {
    name: flowStep.name,
    async execute(
      input: TInput,
      ctx: SagaContext
    ): Promise<Result<Record<string, unknown>>> {
      return flowStep.execute(input, ctx);
    },
    compensate: flowStep.compensate
      ? async (input: TInput, ctx: SagaContext): Promise<void> => {
          await flowStep.compensate!(input, ctx);
        }
      : undefined,
  };
}

/**
 * Create a no-op saga step that always succeeds with an empty record.
 * Useful as a placeholder when a flow step has no side effects to model.
 */
export function noopFlowStep<TInput>(name: string): FlowStep<TInput> {
  return {
    name,
    async execute(): Promise<Result<Record<string, unknown>>> {
      return ok({});
    },
  };
}

/**
 * Create a flow step that wraps a plain async function returning Result.
 * Provides a concise way to inline simple steps without implementing FlowStep.
 */
export function inlineFlowStep<TInput>(
  name: string,
  fn: (
    input: TInput,
    ctx: SagaContext
  ) => Promise<Result<Record<string, unknown>>>,
  compensateFn?: (input: TInput, ctx: SagaContext) => Promise<void>
): FlowStep<TInput> {
  return {
    name,
    execute: fn,
    compensate: compensateFn,
  };
}

/**
 * Guard helper: return a validation error if a required context key is missing.
 */
export function requireContextKey<T>(
  ctx: SagaContext,
  key: string
): Result<T> {
  const value = ctx.data[key];
  if (value === undefined || value === null) {
    return err(new Error(`Required context key "${key}" is missing`));
  }
  return ok(value as T);
}
