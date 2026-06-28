// MCP server application configuration — reads env vars and exposes typed config.

import { z } from "zod";

const McpServerConfigSchema = z.object({
  /** Transport mode: "stdio" for CLI/agent use, "http" for network-accessible MCP. */
  transport: z.enum(["stdio", "http"]).default("stdio"),
  /** HTTP port when transport is "http". */
  port: z.coerce.number().int().min(1).max(65535).default(3100),
  /** Host to bind when transport is "http". */
  host: z.string().default("0.0.0.0"),
  /** MCP server name announced in initialize response. */
  serverName: z.string().default("veritas-mcp"),
  /** MCP server version announced in initialize response. */
  serverVersion: z.string().default("1.0.0"),
  /** Log level for the server process. */
  logLevel: z.enum(["silent", "error", "warn", "info", "debug", "trace"]).default("info"),
  /** Log format. */
  logFormat: z.enum(["json", "pretty"]).default("json"),
});

export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;

/** Load and validate MCP server config from environment variables. */
export function loadMcpServerConfig(): McpServerConfig {
  const raw = {
    transport: process.env["MCP_TRANSPORT"],
    port: process.env["MCP_PORT"],
    host: process.env["MCP_HOST"],
    serverName: process.env["MCP_SERVER_NAME"],
    serverVersion: process.env["MCP_SERVER_VERSION"],
    logLevel: process.env["LOG_LEVEL"],
    logFormat: process.env["LOG_FORMAT"],
  };

  const result = McpServerConfigSchema.safeParse(raw);
  if (!result.success) {
    const messages = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`MCP server configuration validation failed:\n${messages}`);
  }
  return result.data;
}
