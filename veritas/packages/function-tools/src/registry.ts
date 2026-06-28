// registry: in-memory store of named FunctionTools keyed by ToolName.

import type { FunctionTool } from "./tool.js";
import type { ToolName } from "./types.js";
import { asToolName } from "./types.js";

/** In-memory registry mapping tool names to their definitions. */
export class ToolRegistry {
  private readonly _tools: Map<ToolName, FunctionTool> = new Map();

  /** Register a tool; throws if a tool with the same name is already registered. */
  register(tool: FunctionTool): void {
    const name = asToolName(tool.name);
    if (this._tools.has(name)) {
      throw new Error(`Tool already registered: ${name}`);
    }
    this._tools.set(name, tool);
  }

  /** Register or overwrite a tool unconditionally. */
  set(tool: FunctionTool): void {
    this._tools.set(asToolName(tool.name), tool);
  }

  /** Look up a tool by name; returns undefined if not found. */
  get(name: string): FunctionTool | undefined {
    return this._tools.get(asToolName(name));
  }

  /** Check whether a tool name is registered. */
  has(name: string): boolean {
    return this._tools.has(asToolName(name));
  }

  /** Return all registered tool definitions as an immutable array. */
  list(): ReadonlyArray<FunctionTool> {
    return [...this._tools.values()];
  }

  /** Number of registered tools. */
  get size(): number {
    return this._tools.size;
  }
}

/** Singleton default registry instance shared across the package. */
export const defaultRegistry = new ToolRegistry();
