// verify function tool: runs the Veritas verification pipeline on a text or claim list.

import { z } from "zod";
import { toAppError, ValidationError, noopLogger, isOk, isErr } from "@veritas/core";
import { runVerification } from "@veritas/verification";
import { globalRegistry } from "@veritas/llm";
import type { FunctionTool } from "../tool.js";
import type { ToolResult } from "../result.js";
import { toolSuccess, toolFailure } from "../result.js";
import { asToolName } from "../types.js";

const inputSchema = z.object({
  text: z
    .string()
    .min(1)
    .optional()
    .describe("Free-form text containing claims to verify."),
  claims: z
    .array(z.string().min(1))
    .optional()
    .describe("Explicit list of claims to verify instead of free-form text."),
  context: z
    .string()
    .optional()
    .describe("Optional background context to assist verification."),
  allowedDomains: z
    .array(z.string().min(1))
    .optional()
    .describe("Restrict evidence sources to these domains."),
});

/** Output returned by the verify tool on success. */
export interface VerifyOutput {
  readonly schema: "veritas.report.v1";
  readonly summary: string;
  readonly trustScore: number;
  readonly counts: {
    readonly supported: number;
    readonly refuted: number;
    readonly unverifiable: number;
  };
  readonly durationMs: number;
  readonly totalTokensUsed: number;
}

/** FunctionTool that runs a full Veritas verification pipeline. */
export const verifyTool: FunctionTool<typeof inputSchema> = {
  name: asToolName("verify"),
  description:
    "Verify the factual accuracy of one or more claims or a block of text. " +
    "Returns a structured report with a trust score, per-claim verdicts, and source citations.",
  inputSchema,

  async handler(rawInput: unknown): Promise<ToolResult> {
    const parsed = inputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return toolFailure(
        "verify",
        new ValidationError({ message: parsed.error.message }),
      );
    }

    const { text, claims, context, allowedDomains } = parsed.data;

    if (!text && (!claims || claims.length === 0)) {
      return toolFailure(
        "verify",
        new ValidationError({ message: "Provide either `text` or at least one `claims` entry." }),
      );
    }

    // Resolve the LLM provider from the global registry at call time.
    const llmResult = globalRegistry.select();
    if (isErr(llmResult)) {
      return toolFailure("verify", llmResult.error);
    }

    try {
      const result = await runVerification(
        { text, claims, context, options: allowedDomains ? { allowedDomains } : undefined },
        { llm: llmResult.value, logger: noopLogger },
      );

      if (!isOk(result)) {
        return toolFailure("verify", result.error);
      }

      const { report, durationMs, totalTokensUsed } = result.value;
      const output: VerifyOutput = {
        schema: report.schema,
        summary: report.summary,
        trustScore: report.trustScore,
        counts: report.counts,
        durationMs,
        totalTokensUsed,
      };

      return toolSuccess("verify", output);
    } catch (e: unknown) {
      return toolFailure("verify", toAppError(e));
    }
  },
};
