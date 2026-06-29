// Guard stage: gate raw input through an optional InputGuard before any LLM work.

import { ValidationError } from "@veritas/core";
import type { VerificationContext } from "../pipeline/context.js";

/**
 * Pipeline stage that runs the configured `InputGuard` (if any) over the raw
 * input text. A blocked decision throws a `ValidationError`, short-circuiting
 * the pipeline before research/adjudication — so unsafe or malformed input
 * never reaches the LLM (and, in the CAP flow, never locks funds).
 *
 * No-op when `options.inputGuard` is undefined, keeping the engine fully
 * backward-compatible.
 */
export async function guardInputStage(ctx: VerificationContext): Promise<void> {
  const guard = ctx.options.inputGuard;
  if (guard === undefined) {
    return;
  }

  const decision = await guard.check(ctx.inputText);

  if (!decision.allowed) {
    ctx.logger.warn("guard: input blocked", {
      verificationId: ctx.verificationId,
      reason: decision.reason ?? "blocked by input guard",
    });
    throw new ValidationError({
      message: `Input rejected by guardrails: ${decision.reason ?? "blocked"}`,
    });
  }

  ctx.logger.debug("guard: input allowed", { verificationId: ctx.verificationId });
}
