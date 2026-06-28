// get_report MCP tool — retrieves a previously generated verification report by ID.

import { z } from "zod";
import { ok, err } from "@veritas/core";
import type { Result, AppError } from "@veritas/core";
import { ValidationError } from "@veritas/core";
import type { McpTool } from "../tool.js";
import type { McpToolResult } from "../protocol.js";
import type { VerificationReport } from "@veritas/contracts";

const InputSchema = z.object({
  reportId: z.string().min(1, "reportId must be non-empty"),
});

type Input = z.infer<typeof InputSchema>;

/** In-process report store shared between tool invocations. */
export type ReportStore = ReadonlyMap<string, VerificationReport>;

/** Build a get_report MCP tool backed by the provided report store. */
export function makeGetReportTool(store: ReportStore): McpTool<Input> {
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
    const report = store.get(input.reportId);

    if (report === undefined) {
      return ok({
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Report not found: no report with id "${input.reportId}" exists in this session.`,
          },
        ],
      });
    }

    return ok({
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ reportId: input.reportId, report }, null, 2),
        },
      ],
    });
  }

  return {
    descriptor: {
      name: "get_report",
      description:
        "Retrieve a previously generated verification report by its unique report ID. Returns the full structured report including verdicts, trust score, and citations.",
      inputSchema: {
        type: "object" as const,
        properties: {
          reportId: {
            type: "string",
            description: "The unique identifier of the verification report to retrieve.",
          },
        },
        required: ["reportId"],
      },
    },
    parse,
    execute,
  };
}
