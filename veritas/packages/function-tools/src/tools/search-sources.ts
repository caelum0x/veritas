// search-sources function tool: rank and filter ReportCitation sources by authority score.

import { z } from "zod";
import { toAppError, ValidationError } from "@veritas/core";
import { rankSources } from "@veritas/verification";
import type { FunctionTool } from "../tool.js";
import type { ToolResult } from "../result.js";
import { toolSuccess, toolFailure } from "../result.js";
import { asToolName } from "../types.js";

const citationSchema = z.object({
  url: z.string().url(),
  title: z.string().nullable().optional(),
  quote: z.string().nullable().optional(),
  supports: z.boolean(),
});

const inputSchema = z.object({
  citations: z
    .array(citationSchema)
    .min(1, "At least one citation is required.")
    .describe("List of citation objects to rank by source authority."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Maximum number of top-ranked sources to return. Defaults to all."),
  supportsOnly: z
    .boolean()
    .optional()
    .describe("When true, return only citations where supports=true."),
});

/** A single ranked source in the output. */
export interface RankedSource {
  readonly url: string;
  readonly title: string | null;
  readonly quote: string | null;
  readonly supports: boolean;
  readonly rank: number;
}

/** Output returned by the search-sources tool on success. */
export interface SearchSourcesOutput {
  readonly sources: readonly RankedSource[];
  readonly total: number;
}

/** FunctionTool that ranks and filters citation sources by authority. */
export const searchSourcesTool: FunctionTool<typeof inputSchema> = {
  name: asToolName("search_sources"),
  description:
    "Rank a list of citation sources by authority (academic > government > news > general). " +
    "Optionally filter to supporting citations only and cap results with a limit.",
  inputSchema,

  async handler(rawInput: unknown): Promise<ToolResult> {
    const parsed = inputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return toolFailure(
        "search_sources",
        new ValidationError({ message: parsed.error.message }),
      );
    }

    try {
      const { citations, limit, supportsOnly } = parsed.data;

      const normalized = citations.map((c) => ({
        url: c.url,
        title: c.title ?? null,
        quote: c.quote ?? null,
        supports: c.supports,
      }));

      let ranked = rankSources(normalized);

      if (supportsOnly === true) {
        ranked = ranked.filter((s) => s.supports);
      }

      const capped = limit !== undefined ? ranked.slice(0, limit) : ranked;

      const sources: RankedSource[] = capped.map((s, i) => ({
        url: s.url,
        title: s.title,
        quote: s.quote,
        supports: s.supports,
        rank: i + 1,
      }));

      const output: SearchSourcesOutput = { sources, total: sources.length };
      return toolSuccess("search_sources", output);
    } catch (e: unknown) {
      return toolFailure("search_sources", toAppError(e));
    }
  },
};
