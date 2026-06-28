// MCP tool definition: schema + handler contract for a single callable tool.

import type { Result, AppError } from "@veritas/core";
import type { McpToolResult } from "./protocol.js";

/** JSON Schema property descriptor (subset used by MCP). */
export interface JsonSchemaProperty {
  readonly type: string;
  readonly description?: string;
  readonly items?: JsonSchemaProperty;
  readonly properties?: Record<string, JsonSchemaProperty>;
  readonly required?: readonly string[];
  readonly enum?: readonly unknown[];
}

/** JSON Schema object describing a tool's input. */
export interface McpInputSchema {
  readonly type: "object";
  readonly properties: Record<string, JsonSchemaProperty>;
  readonly required?: readonly string[];
}

/** MCP-spec tool descriptor surfaced to LLM clients. */
export interface McpToolDescriptor {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: McpInputSchema;
}

/** Typed MCP tool: descriptor + async handler. */
export interface McpTool<TInput = unknown> {
  readonly descriptor: McpToolDescriptor;
  /** Parse and validate raw params; return ValidationError on failure. */
  readonly parse: (raw: unknown) => Result<TInput, AppError>;
  /** Execute the tool with validated input. */
  readonly execute: (input: TInput) => Promise<Result<McpToolResult, AppError>>;
}

/** Build a text-only tool result (success). */
export function textResult(text: string): McpToolResult {
  return { content: [{ type: "text", text }] };
}

/** Build an error tool result (isError = true). */
export function errorResult(message: string): McpToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}
