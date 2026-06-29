// Schema guard: validates LLM output conforms to an expected JSON schema via Zod.
import { z } from "zod";
import { BaseGuardrail } from "../guardrail.js";
import type { GuardrailContext, GuardrailResult } from "../types.js";

export interface SchemaGuardOptions {
  /** Zod schema the output JSON must satisfy. */
  readonly schema: z.ZodTypeAny;
  /** Human-readable label used in block/redact reasons. */
  readonly schemaLabel?: string;
}

export class SchemaGuard extends BaseGuardrail {
  readonly id = "schema-guard";
  readonly phase = "output" as const;

  constructor(private readonly opts: SchemaGuardOptions) {
    super();
  }

  protected async evaluate(ctx: GuardrailContext): Promise<GuardrailResult> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(ctx.content);
    } catch {
      return {
        guardrailId: this.id,
        phase: "output",
        decision: "block",
        reason: "Output is not valid JSON and cannot be schema-validated.",
        score: 1.0,
        metadata: { schemaLabel: this.opts.schemaLabel ?? "unknown" },
      };
    }

    const result = this.opts.schema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      return {
        guardrailId: this.id,
        phase: "output",
        decision: "block",
        reason: `Output failed schema validation (${this.opts.schemaLabel ?? "schema"}): ${issues.slice(0, 3).join("; ")}`,
        score: 0.9,
        metadata: {
          schemaLabel: this.opts.schemaLabel ?? "unknown",
          issueCount: issues.length,
          issues: issues.slice(0, 10),
        },
      };
    }

    return {
      guardrailId: this.id,
      phase: "output",
      decision: "allow",
      score: 0.0,
      metadata: { schemaLabel: this.opts.schemaLabel ?? "unknown" },
    };
  }
}
