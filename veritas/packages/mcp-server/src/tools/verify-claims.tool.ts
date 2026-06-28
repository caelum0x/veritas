// verify_claims MCP tool: verifies an explicit list of factual claims.

import { z } from "zod";
import { ok, err, isErr } from "@veritas/core";
import type { Result, AppError } from "@veritas/core";
import { ValidationError } from "@veritas/core";
import { runVerification } from "@veritas/verification";
import type { EngineOptions } from "@veritas/verification";
import type { McpTool, McpInputSchema } from "../tool.js";
import type { McpToolResult } from "../protocol.js";
import { textResult, errorResult } from "../tool.js";

const InputSchema = z.object({
  claims: z
    .array(z.string().min(1))
    .min(1)
    .max(50)
    .describe("Array of factual claims to verify (max 50)."),
  context: z
    .string()
    .max(4000)
    .optional()
    .describe("Optional background context to assist verification."),
  allowedDomains: z
    .array(z.string().min(1))
    .optional()
    .describe("Optional allowlist of source domains."),
});

type Input = z.infer<typeof InputSchema>;

const INPUT_SCHEMA: McpInputSchema = {
  type: "object",
  properties: {
    claims: {
      type: "array",
      description: "Array of factual claims to verify (max 50).",
      items: { type: "string", description: "A single factual claim." },
    },
    context: {
      type: "string",
      description: "Optional background context to assist verification.",
    },
    allowedDomains: {
      type: "array",
      description: "Optional allowlist of source domains.",
      items: { type: "string", description: "A domain name." },
    },
  },
  required: ["claims"],
};

/** Format a verification report as human-readable Markdown. */
function formatReport(report: {
  summary: string;
  trustScore: number;
  counts: { supported: number; refuted: number; unverifiable: number };
  claims: ReadonlyArray<{
    claim: string;
    verdict: string;
    confidence: number;
    reasoning: string;
    citations: ReadonlyArray<{ url: string; title: string | null; supports: boolean }>;
  }>;
}): string {
  const lines: string[] = [
    `# Verification Report`,
    ``,
    `**Trust Score:** ${report.trustScore.toFixed(1)}/100`,
    `**Supported:** ${report.counts.supported} | **Refuted:** ${report.counts.refuted} | **Unverifiable:** ${report.counts.unverifiable}`,
    ``,
    `## Summary`,
    report.summary,
    ``,
    `## Claims`,
  ];

  for (const c of report.claims) {
    const confidencePct = (c.confidence * 100).toFixed(0);
    lines.push(``, `### ${c.claim}`);
    lines.push(`- **Verdict:** ${c.verdict} (confidence: ${confidencePct}%)`);
    lines.push(`- **Reasoning:** ${c.reasoning}`);
    if (c.citations.length > 0) {
      lines.push(`- **Sources:**`);
      for (const cit of c.citations) {
        const label = cit.title ?? cit.url;
        const stance = cit.supports ? "✓" : "✗";
        lines.push(`  - ${stance} [${label}](${cit.url})`);
      }
    }
  }

  return lines.join("\n");
}

/** Factory: creates the verify_claims tool bound to the given engine options. */
export function createVerifyClaimsTool(engineOptions: EngineOptions): McpTool<Input> {
  function parse(raw: unknown): Result<Input, AppError> {
    const result = InputSchema.safeParse(raw);
    if (!result.success) {
      return err(
        new ValidationError({
          message: "Invalid verify_claims input",
          issues: result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        }),
      );
    }
    return ok(result.data);
  }

  async function execute(input: Input): Promise<Result<McpToolResult, AppError>> {
    const verifyResult = await runVerification(
      {
        claims: input.claims,
        context: input.context,
        options: input.allowedDomains
          ? { allowedDomains: input.allowedDomains }
          : undefined,
      },
      engineOptions,
    );

    if (isErr(verifyResult)) {
      return ok(errorResult(`Verification failed: ${verifyResult.error.message}`));
    }

    const { report } = verifyResult.value;
    const markdown = formatReport(report);
    return ok(textResult(markdown));
  }

  return {
    descriptor: {
      name: "verify_claims",
      description:
        "Verify one or more factual claims using the Veritas fact-checking engine. " +
        "Returns a structured report with verdicts, confidence scores, and source citations.",
      inputSchema: INPUT_SCHEMA,
    },
    parse,
    execute,
  };
}
