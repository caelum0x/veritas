// MCP-specific error types mapping JSON-RPC 2.0 error codes to domain errors.
import { AppError, NotFoundError, ValidationError, InternalError } from "@veritas/core";

/** Standard JSON-RPC 2.0 and MCP-extension error codes. */
export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  TOOL_NOT_FOUND: -32001,
  RESOURCE_NOT_FOUND: -32002,
  PROMPT_NOT_FOUND: -32003,
  CAPABILITY_NOT_SUPPORTED: -32004,
} as const;

export type McpErrorCode = (typeof MCP_ERROR_CODES)[keyof typeof MCP_ERROR_CODES];

/** Base class for all MCP-layer errors. */
export class McpError extends AppError {
  readonly mcpKind: string = "MCP_ERROR";

  constructor(message: string, public readonly mcpCode: McpErrorCode, cause?: unknown) {
    super("INTERNAL", 500, message, { message, cause });
  }
}

/** Raised when JSON-RPC request payload cannot be parsed. */
export class McpParseError extends McpError {
  override readonly mcpKind = "MCP_PARSE_ERROR";

  constructor(cause?: unknown) {
    super("Failed to parse MCP request", MCP_ERROR_CODES.PARSE_ERROR, cause);
  }
}

/** Raised when a requested method is not registered. */
export class McpMethodNotFoundError extends McpError {
  override readonly mcpKind = "MCP_METHOD_NOT_FOUND";

  constructor(method: string) {
    super(`Method not found: ${method}`, MCP_ERROR_CODES.METHOD_NOT_FOUND);
  }
}

/** Raised when MCP request params fail schema validation. */
export class McpInvalidParamsError extends McpError {
  override readonly mcpKind = "MCP_INVALID_PARAMS";

  constructor(message: string) {
    super(message, MCP_ERROR_CODES.INVALID_PARAMS);
  }
}

/** Raised when an internal server error occurs during MCP request handling. */
export class McpInternalError extends McpError {
  override readonly mcpKind = "MCP_INTERNAL_ERROR";

  constructor(message: string, cause?: unknown) {
    super(message, MCP_ERROR_CODES.INTERNAL_ERROR, cause);
  }
}

/** Raised when a requested MCP tool is not registered. */
export class McpToolNotFoundError extends McpError {
  override readonly mcpKind = "MCP_TOOL_NOT_FOUND";

  constructor(toolName: string) {
    super(`Tool not found: ${toolName}`, MCP_ERROR_CODES.TOOL_NOT_FOUND);
  }
}

/** Raised when a requested MCP resource URI does not match any handler. */
export class McpResourceNotFoundError extends McpError {
  override readonly mcpKind = "MCP_RESOURCE_NOT_FOUND";

  constructor(uri: string) {
    super(`Resource not found: ${uri}`, MCP_ERROR_CODES.RESOURCE_NOT_FOUND);
  }
}

/** Raised when a requested MCP prompt is not registered. */
export class McpPromptNotFoundError extends McpError {
  override readonly mcpKind = "MCP_PROMPT_NOT_FOUND";

  constructor(promptName: string) {
    super(`Prompt not found: ${promptName}`, MCP_ERROR_CODES.PROMPT_NOT_FOUND);
  }
}

/** Narrow-check for any MCP-layer error. */
export function isMcpError(err: unknown): err is McpError {
  return err instanceof McpError;
}

/** Map an MCP error to its JSON-RPC error code. */
export function toMcpErrorCode(err: McpError): McpErrorCode {
  return err.mcpCode;
}

/** Build a JSON-RPC error object payload from an MCP error. */
export function buildMcpErrorPayload(
  err: McpError,
): { code: McpErrorCode; message: string; data?: unknown } {
  return {
    code: toMcpErrorCode(err),
    message: err.message,
    data: err.details ?? undefined,
  };
}
