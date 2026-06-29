// FunctionTool: typed definition of a callable tool with name, Zod input schema, and handler.

import { z } from "zod";
import type { ToolResult } from "./result.js";
import type { ToolName } from "./types.js";
import { asToolName } from "./types.js";

/** A callable function tool parameterised by its Zod input schema. */
export interface FunctionTool<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  /** Unique snake_case tool identifier. */
  readonly name: ToolName;
  /** Human-readable description passed to the LLM. */
  readonly description: string;
  /** Zod schema used to validate raw tool input. */
  readonly inputSchema: TSchema;
  /** Handler invoked with raw input; validates internally and returns a ToolResult. */
  readonly handler: (input: unknown) => Promise<ToolResult>;
}

/**
 * Convenience factory that freezes the definition and brands the name.
 * Allows passing a plain string name that gets converted to ToolName.
 */
export function defineTool<TSchema extends z.ZodTypeAny>(
  definition: Omit<FunctionTool<TSchema>, "name"> & { name: string },
): FunctionTool<TSchema> {
  return Object.freeze({
    ...definition,
    name: asToolName(definition.name),
  }) as FunctionTool<TSchema>;
}
