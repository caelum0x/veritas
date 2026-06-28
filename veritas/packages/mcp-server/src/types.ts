// Shared internal types for the @veritas/mcp-server MCP implementation.

import { z } from "zod";

/** MCP protocol version string */
export const MCP_PROTOCOL_VERSION = "2024-11-05";

/** JSON-RPC 2.0 identifier */
export const JSONRPC_VERSION = "2.0";

/** Primitive JSON value */
export type JsonPrimitive = string | number | boolean | null;

/** Recursive JSON value */
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

/** MCP tool content item */
export const ToolContentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    text: z.string(),
  }),
  z.object({
    type: z.literal("image"),
    data: z.string(),
    mimeType: z.string(),
  }),
  z.object({
    type: z.literal("resource"),
    resource: z.object({
      uri: z.string(),
      mimeType: z.string().optional(),
      text: z.string().optional(),
      blob: z.string().optional(),
    }),
  }),
]);

export type ToolContent = z.infer<typeof ToolContentSchema>;

/** MCP tool call result */
export interface ToolCallResult {
  readonly content: readonly ToolContent[];
  readonly isError?: boolean;
}

/** MCP resource content */
export interface ResourceContent {
  readonly uri: string;
  readonly mimeType?: string;
  readonly text?: string;
  readonly blob?: string;
}

/** MCP resource read result */
export interface ResourceReadResult {
  readonly contents: readonly ResourceContent[];
}

/** MCP prompt message role */
export type PromptRole = "user" | "assistant";

/** MCP prompt message content */
export interface PromptMessageContent {
  readonly type: "text";
  readonly text: string;
}

/** MCP prompt message */
export interface PromptMessage {
  readonly role: PromptRole;
  readonly content: PromptMessageContent;
}

/** MCP get prompt result */
export interface GetPromptResult {
  readonly description?: string;
  readonly messages: readonly PromptMessage[];
}

/** MCP server info */
export interface ServerInfo {
  readonly name: string;
  readonly version: string;
}

/** MCP client info */
export interface ClientInfo {
  readonly name: string;
  readonly version: string;
}

/** MCP initialize params */
export interface InitializeParams {
  readonly protocolVersion: string;
  readonly capabilities: Record<string, unknown>;
  readonly clientInfo: ClientInfo;
}

/** MCP initialize result */
export interface InitializeResult {
  readonly protocolVersion: string;
  readonly capabilities: Record<string, unknown>;
  readonly serverInfo: ServerInfo;
}

/** MCP tool argument schema property */
export interface SchemaProperty {
  readonly type: string;
  readonly description?: string;
  readonly items?: SchemaProperty;
  readonly properties?: Record<string, SchemaProperty>;
  readonly required?: readonly string[];
  readonly enum?: readonly JsonPrimitive[];
  readonly minimum?: number;
  readonly maximum?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
}

/** MCP tool argument schema */
export interface ToolInputSchema {
  readonly type: "object";
  readonly properties: Record<string, SchemaProperty>;
  readonly required?: readonly string[];
}

/** MCP resource template */
export interface ResourceTemplate {
  readonly uriTemplate: string;
  readonly name: string;
  readonly description?: string;
  readonly mimeType?: string;
}

/** MCP resource descriptor */
export interface ResourceDescriptor {
  readonly uri: string;
  readonly name: string;
  readonly description?: string;
  readonly mimeType?: string;
}

/** MCP prompt argument */
export interface PromptArgument {
  readonly name: string;
  readonly description?: string;
  readonly required?: boolean;
}

/** Internal request context passed through handlers */
export interface RequestContext {
  readonly requestId: string | number;
  readonly method: string;
  readonly params: Record<string, unknown>;
}
