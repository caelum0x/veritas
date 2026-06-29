// Shared type definitions for the function-tools package.

import type { Result } from "@veritas/core";
import type { ZodTypeAny, z } from "zod";

/** Unique name identifying a registered function tool. */
export type ToolName = string & { readonly _brand: "ToolName" };

export function asToolName(name: string): ToolName {
  return name as ToolName;
}

/** JSON-serialisable value used as tool input/output. */
export type ToolInput = Record<string, unknown>;
export type ToolOutput = Record<string, unknown>;

/** A single function tool definition. */
export interface FunctionTool<TSchema extends ZodTypeAny = ZodTypeAny> {
  /** Unique tool name (snake_case). */
  readonly name: ToolName;
  /** Human-readable description passed to the LLM. */
  readonly description: string;
  /** Zod schema for input validation. */
  readonly inputSchema: TSchema;
  /** Handler invoked with validated input; returns a Result. */
  readonly handler: (input: z.infer<TSchema>) => Promise<Result<ToolOutput>>;
}

/** Serialised tool result returned by a dispatcher. */
export interface ToolResult {
  readonly toolName: ToolName;
  /** Whether the call succeeded. */
  readonly success: boolean;
  /** Present on success. */
  readonly output?: ToolOutput;
  /** Present on failure. */
  readonly error?: string;
}

/** Anthropic tool_use message content block. */
export interface AnthropicToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: ToolInput;
}

/** Anthropic tool_result message content block. */
export interface AnthropicToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
}

/** Anthropic tool definition for Messages API. */
export interface AnthropicToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

/** OpenAI function definition. */
export interface OpenAIFunctionDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

/** OpenAI tool_call object. */
export interface OpenAIToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}
