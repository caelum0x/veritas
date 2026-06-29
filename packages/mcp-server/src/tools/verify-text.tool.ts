// verify_text MCP tool — verifies free-form text by extracting and adjudicating claims.

import { z } from "zod";
import { ok, err, isErr, noopLogger } from "@veritas/core";
import type { Result, AppError, Logger } from "@veritas/core";
import { ValidationError } from "@veritas/core";
import { runVerification } from "@veritas/verification";
import type { EngineOptions } from "@veritas/verification";
import type { McpTool } from "../tool.js";
import type { McpToolResult } from "../protocol.js";

const InputSchema = z.object({
  text: z.string().min(1, "text must be non-empty"),
  context: z.string().optional(),
  allowedDomains: z.array(z.string()).optional(),
  effort: z.enum(["low", "standard", "high"]).optional(),
});

type Input = z.infer<typeof InputSchema>;

/** Build MCP verify_text tool bound to the given engine options. */
export function makeVerifyTextTool(engineOptions: Omit<EngineOptions, "signal">): McpTool<Input> {
  function parse(raw: unknown): Result<Input, AppError> {
    const result = InputSchema.safeParse(raw);
    if (!result.success) {
      return err(
        new ValidationError({
          message: result.error.issues.map((i) => i.message).join("; "),
        }),
      );
    }
    return ok(result.data);
  }

  async function execute(input: Input): Promise<Result<McpToolResult, AppError>> {
    const logger: Logger = engineOptions.logger ?? noopLogger;
    const controller = new AbortController();

    const options: EngineOptions = {
      ...engineOptions,
      effort: input.effort ?? engineOptions.effort ?? "standard",
      signal: controller.signal,
    };

    const request = {
      text: input.text,
      ...(input.context !== undefined ? { context: input.context } : {}),
      ...(input.allowedDomains !== undefined
        ? { options: { allowedDomains: input.allowedDomains } }
        : {}),
    };

    logger.info("verify_text tool: starting", { textLength: input.text.length });

    const result = await runVerification(request, options);

    if (isErr(result)) {
      const e: AppError = result.error;
      return ok({
        isError: true,
        content: [{ type: "text" as const, text: `Verification failed: ${e.message}` }],
      });
    }

    const { report, totalTokensUsed, durationMs } = result.value;

    return ok({
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ report, meta: { totalTokensUsed, durationMs } }, null, 2),
        },
      ],
    });
  }

  return {
    descriptor: {
      name: "verify_text",
      description:
        "Extract claims from free-form text and verify each one against web sources. Returns a structured report with verdicts, confidence scores, and citations.",
      inputSchema: {
        type: "object" as const,
        properties: {
          text: { type: "string", description: "The text whose claims should be verified." },
          context: { type: "string", description: "Optional background context for the verifier." },
          allowedDomains: {
            type: "array",
            items: { type: "string" },
            description: "Restrict source lookups to these domains (optional).",
          },
          effort: {
            type: "string",
            enum: ["low", "standard", "high"],
            description: "Verification effort level (default: standard).",
          },
        },
        required: ["text"],
      },
    },
    parse,
    execute,
  };
}
