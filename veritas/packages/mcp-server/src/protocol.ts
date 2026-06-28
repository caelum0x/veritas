// MCP JSON-RPC 2.0 protocol types for the Model Context Protocol.

import { z } from "zod";

/** JSON-RPC 2.0 identifier (string | number | null). */
export type JsonRpcId = string | number | null;

/** Base JSON-RPC 2.0 request shape. */
export const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
  method: z.string(),
  params: z.unknown().optional(),
});
export type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;

/** JSON-RPC 2.0 error object. */
export const JsonRpcErrorSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.unknown().optional(),
});
export type JsonRpcError = z.infer<typeof JsonRpcErrorSchema>;

/** JSON-RPC 2.0 success response. */
export interface JsonRpcSuccess {
  readonly jsonrpc: "2.0";
  readonly id: JsonRpcId;
  readonly result: unknown;
}

/** JSON-RPC 2.0 error response. */
export interface JsonRpcFailure {
  readonly jsonrpc: "2.0";
  readonly id: JsonRpcId;
  readonly error: JsonRpcError;
}

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcFailure;

/** Standard JSON-RPC error codes. */
export const RPC_PARSE_ERROR = -32700;
export const RPC_INVALID_REQUEST = -32600;
export const RPC_METHOD_NOT_FOUND = -32601;
export const RPC_INVALID_PARAMS = -32602;
export const RPC_INTERNAL_ERROR = -32603;

/** MCP-specific error codes (above -32000). */
export const MCP_TOOL_ERROR = -32000;
export const MCP_RESOURCE_ERROR = -32001;

/** Build a JSON-RPC success response. */
export function rpcSuccess(id: JsonRpcId, result: unknown): JsonRpcSuccess {
  return { jsonrpc: "2.0", id, result };
}

/** Build a JSON-RPC error response. */
export function rpcError(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcFailure {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

/** MCP initialize result shape. */
export interface McpInitializeResult {
  readonly protocolVersion: string;
  readonly serverInfo: { readonly name: string; readonly version: string };
  readonly capabilities: Record<string, unknown>;
}

/** MCP tool invocation content block. */
export interface McpTextContent {
  readonly type: "text";
  readonly text: string;
}

/** MCP tool call result. */
export interface McpToolResult {
  readonly content: readonly McpTextContent[];
  readonly isError?: boolean;
}
