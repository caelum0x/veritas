// Pipeline: compose an ordered list of Stages and execute them sequentially.

import { ok, isErr } from "@veritas/core";
import type { Result, AppError } from "@veritas/core";
import type { Stage } from "./stage.js";
import type { VerificationContext } from "./context.js";

/**
 * A composed verification pipeline.
 * Stages run in declaration order; the first error short-circuits execution.
 */
export interface Pipeline {
  /** Ordered stages that make up this pipeline. */
  readonly stages: ReadonlyArray<Stage>;

  /**
   * Run all stages sequentially, threading context through each.
   * Returns the final context on success or the first error encountered.
   */
  run(initial: VerificationContext): Promise<Result<VerificationContext, AppError>>;
}

/**
 * Build a Pipeline from an ordered list of stages.
 * Each stage receives the output context of the previous one.
 */
export function composePipeline(stages: ReadonlyArray<Stage>): Pipeline {
  return {
    stages,
    async run(initial: VerificationContext): Promise<Result<VerificationContext, AppError>> {
      let ctx = initial;

      for (const stage of stages) {
        ctx.logger.debug(`[pipeline] entering stage "${stage.name}"`);

        const result = await stage.run(ctx);

        if (isErr(result)) {
          ctx.logger.error(`[pipeline] stage "${stage.name}" failed`, {
            code: result.error.code,
            message: result.error.message,
          });
          return result;
        }

        ctx = result.value;
        ctx.logger.debug(`[pipeline] completed stage "${stage.name}"`, {
          totalTokensUsed: ctx.totalTokensUsed,
          claimCount: ctx.claims.length,
        });
      }

      return ok(ctx);
    },
  };
}
