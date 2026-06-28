// Guardrail pipeline: runs all registered guardrails for a phase and resolves the decision.
import { ok, err, isOk } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { GuardrailContext, PipelineResult, GuardrailResult } from "./types.js";
import type { GuardrailRegistry } from "./registry.js";
import { resolveDecision } from "./decision.js";
import { GuardrailBlockedError } from "./errors.js";

export interface PipelineOptions {
  /** If true, a block decision is returned as an Err instead of an Ok PipelineResult. */
  readonly rejectOnBlock?: boolean;
}

export class GuardrailPipeline {
  constructor(
    private readonly registry: GuardrailRegistry,
    private readonly options: PipelineOptions = {},
  ) {}

  async run(ctx: GuardrailContext): Promise<Result<PipelineResult>> {
    const guardrails = this.registry.forPhase(ctx.phase);
    const settled: GuardrailResult[] = [];

    for (const guardrail of guardrails) {
      const result = await guardrail.run(ctx);
      if (isOk(result)) {
        settled.push(result.value);
      }
      // skip failed guardrails to avoid cascading failures
    }

    const pipelineResult = resolveDecision(ctx.requestId, ctx.phase, ctx.content, settled);

    if (pipelineResult.finalDecision === "block" && this.options.rejectOnBlock) {
      const blocking = settled.find((r) => r.decision === "block");
      return err(
        new GuardrailBlockedError(
          blocking?.guardrailId ?? "unknown",
          blocking?.reason ?? "blocked by guardrail",
        ),
      );
    }

    return ok(pipelineResult);
  }
}
