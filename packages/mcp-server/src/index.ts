// Public surface of @veritas/mcp-server — MCP-compliant fact-verification agent.

// Core server
export { McpServer } from "./server.js";

// Protocol
export type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
} from "./protocol.js";

// Transport
export type { McpTransport } from "./transport.js";

// Tool
export type { McpTool } from "./tool.js";

// Resource
export type { McpResource } from "./resource.js";

// Prompt
export type { McpPrompt } from "./prompt.js";

// Registry
export { ToolResourceRegistry } from "./registry.js";

// Handler
export { RequestHandler } from "./handler.js";

// Capabilities
export { buildCapabilities } from "./capabilities.js";

// Errors
export {
  McpError,
  McpParseError,
  McpMethodNotFoundError,
  McpInvalidParamsError,
  McpInternalError,
  isMcpError,
  MCP_ERROR_CODES,
} from "./errors.js";

// Types
export type {
  JsonValue,
  JsonPrimitive,
  ToolContent,
  ToolCallResult,
  ResourceContent,
  ResourceReadResult,
  PromptRole,
  PromptMessage,
  PromptMessageContent,
  GetPromptResult,
  ServerInfo,
  ClientInfo,
  InitializeParams,
  InitializeResult,
  ToolInputSchema,
  SchemaProperty,
  ResourceTemplate,
  ResourceDescriptor,
  PromptArgument,
  RequestContext,
} from "./types.js";
export { ToolContentSchema, MCP_PROTOCOL_VERSION, JSONRPC_VERSION } from "./types.js";

// Built-in tools
export { createVerifyClaimsTool } from "./tools/verify-claims.tool.js";
export { makeVerifyTextTool } from "./tools/verify-text.tool.js";
export { makeGetReportTool } from "./tools/get-report.tool.js";

// Built-in resources
export { makeReportsResource } from "./resources/reports.resource.js";

// Built-in prompts
export { factCheckPrompt } from "./prompts/fact-check.prompt.js";
