// Guardrail interface and base helper for building typed guardrail implementations.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Guardrail, GuardrailContext, GuardrailResult, GuardrailPhase } from "./types.js";

export type { Guardrail, GuardrailContext, GuardrailResult, GuardrailPhase };

/**
 * Abstract base that handles error wrapping so concrete guardrails only need
 * to implement `evaluate`.  Returns a fully-formed GuardrailResult.
 */
export abstract class BaseGuardrail implements Guardrail {
  abstract readonly id: string;
  abstract readonly phase: GuardrailPhase;

  async run(ctx: GuardrailContext): Promise<Result<GuardrailResult>> {
    try {
      const result = await this.evaluate(ctx);
      return ok(result);
    } catch (e: unknown) {
      return err(e);
    }
  }

  protected abstract evaluate(ctx: GuardrailContext): Promise<GuardrailResult>;
}
