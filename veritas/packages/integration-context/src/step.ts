// Flow step helper — wraps async operations with Result short-circuit and logging.

import { ok, err, isOk, type Result } from "@veritas/core";
import type { AppError } from "@veritas/core";
import type { IntegrationContext } from "./context.js";

/** A single step function: takes a value, returns a Result. */
export type StepFn<In, Out, E = AppError> = (
  input: In,
  ctx: IntegrationContext
) => Promise<Result<Out, E>>;

/** Options for a named step. */
export interface StepOptions {
  readonly name: string;
  readonly logInput?: boolean;
}

/**
 * Wrap a step function with structured logging.
 * On failure, logs the error and preserves the Err result for upstream short-circuit.
 */
export function defineStep<In, Out, E = AppError>(
  opts: StepOptions,
  fn: StepFn<In, Out, E>
): StepFn<In, Out, E> {
  return async (input: In, ctx: IntegrationContext): Promise<Result<Out, E>> => {
    ctx.logger.info("step.start", {
      step: opts.name,
      ...(opts.logInput ? { input } : {}),
    });
    let result: Result<Out, E>;
    try {
      result = await fn(input, ctx);
    } catch (thrown: unknown) {
      ctx.logger.error("step.threw", { step: opts.name, error: thrown });
      return err(thrown as E);
    }
    if (isOk(result)) {
      ctx.logger.info("step.ok", { step: opts.name });
    } else {
      ctx.logger.warn("step.err", { step: opts.name, error: result.error });
    }
    return result;
  };
}

/**
 * Run an ordered list of steps, short-circuiting on the first Err.
 * Each step receives the output of the previous step.
 */
export async function runSteps<T, E = AppError>(
  initial: T,
  steps: ReadonlyArray<StepFn<T, T, E>>,
  ctx: IntegrationContext
): Promise<Result<T, E>> {
  let current: Result<T, E> = ok(initial);
  for (const step of steps) {
    if (!isOk(current)) return current;
    current = await step(current.value, ctx);
  }
  return current;
}
