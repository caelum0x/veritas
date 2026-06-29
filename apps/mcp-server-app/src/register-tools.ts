// register-tools: registers all Veritas MCP tools, resources, and prompts into the registry.

import type { EngineOptions } from "@veritas/verification";
import {
  ToolResourceRegistry,
  factCheckPrompt,
  makeVerifyTextTool,
  makeGetReportTool,
  makeReportsResource,
} from "@veritas/mcp-server";
import type { VerificationReport } from "@veritas/contracts";
import type { Logger } from "@veritas/observability";

/** Mutable registry used to persist reports across tool calls within a session. */
export type ReportRegistry = Map<string, VerificationReport>;

/** Create a new empty report registry shared between tools and resources. */
function createReportRegistry(): ReportRegistry {
  return new Map<string, VerificationReport>();
}


export interface RegisterToolsResult {
  readonly registry: ToolResourceRegistry;
  readonly reportRegistry: ReportRegistry;
}

/**
 * Instantiate all Veritas MCP tools, resources, and prompts and register
 * them into a fresh ToolResourceRegistry.
 */
export function registerTools(
  engineOptions: Omit<EngineOptions, "signal">,
  logger: Logger,
): RegisterToolsResult {
  const reportRegistry = createReportRegistry();

  const verifyTextTool = makeVerifyTextTool({ ...engineOptions, logger });
  const getReportTool = makeGetReportTool(reportRegistry);
  const reportsResource = makeReportsResource(reportRegistry);

  const registry = new ToolResourceRegistry();
  registry
    .registerTool(verifyTextTool as never)
    .registerTool(getReportTool as never)
    .registerResource(reportsResource)
    .registerPrompt(factCheckPrompt);

  logger.info("mcp tools registered", {
    tools: registry.listTools().map((t) => t.descriptor.name),
    resources: registry.listResources().map((r) => r.uriTemplate),
    prompts: registry.listPrompts().map((p) => p.name),
  });

  return { registry, reportRegistry };
}
