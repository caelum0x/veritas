// Stage interface and helpers for a typed verification pipeline step.

import type { Result } from "@veritas/core";
import type { AppError } from "@veritas/core";
import type { VerificationContext } from "./context.js";

/**
 * A single transformation step in the verification pipeline.
 * Each stage receives the current context, performs its work, and returns
 * an updated context or an error. Stages must not mutate the input context.
 */
export interface Stage {
  /** Human-readable name used in logs and traces. */
  readonly name: string;

  /**
   * Execute this stage's logic.
   *
   * @param ctx - Immutable snapshot of the pipeline context on entry.
   * @returns A Result wrapping the updated context or a typed error.
   */
  run(ctx: VerificationContext): Promise<Result<VerificationContext, AppError>>;
}

/**
 * Build a lightweight Stage from a name and a plain async function,
 * removing boilerplate for simple transformations.
 */
export function makeStage(
  name: string,
  fn: (ctx: VerificationContext) => Promise<Result<VerificationContext, AppError>>,
): Stage {
  return {
    name,
    run: fn,
  };
}
