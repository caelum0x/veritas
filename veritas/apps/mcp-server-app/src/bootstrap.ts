// bootstrap: wires the MCP server together with engine options and transport.

import { MockProvider } from "@veritas/llm";
import { RequestHandler, ToolResourceRegistry } from "@veritas/mcp-server";
import { createLogger } from "@veritas/observability";
import { registerTools } from "./register-tools.js";
import type { McpServerConfig } from "./config.js";
import type { Logger } from "@veritas/observability";

export interface BootstrapResult {
  readonly handler: RequestHandler;
  readonly registry: ToolResourceRegistry;
  readonly logger: Logger;
  readonly config: McpServerConfig;
}

/**
 * Wire all Veritas MCP server dependencies together.
 * Returns a ready-to-use RequestHandler bound to all registered tools.
 */
export function bootstrap(config: McpServerConfig): BootstrapResult {
  const logger = createLogger({
    level: config.logLevel,
    bindings: { service: config.serverName, version: config.serverVersion },
  });

  const llm = new MockProvider();

  const engineOptions = {
    llm,
    logger,
    concurrency: 5,
    effort: "standard" as const,
  };

  const { registry } = registerTools(engineOptions, logger);

  const handler = new RequestHandler({
    registry,
    serverName: config.serverName,
    serverVersion: config.serverVersion,
    logger,
  });

  logger.info("mcp server bootstrapped", {
    transport: config.transport,
    serverName: config.serverName,
    serverVersion: config.serverVersion,
  });

  return { handler, registry, logger, config };
}
