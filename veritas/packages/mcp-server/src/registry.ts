// ToolResourceRegistry — central registry for MCP tools, resources, and prompts.
import type { McpTool } from "./tool.js";
import type { McpResource } from "./resource.js";
import type { McpPrompt } from "./prompt.js";
import {
  McpToolNotFoundError,
  McpResourceNotFoundError,
  McpPromptNotFoundError,
} from "./errors.js";
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";

/** Snapshot of all registered tools for capability negotiation. */
export interface RegistrySnapshot {
  readonly tools: readonly McpTool[];
  readonly resources: readonly McpResource[];
  readonly prompts: readonly McpPrompt[];
}

/** Immutable central registry for all MCP-exposed capabilities. */
export class ToolResourceRegistry {
  private readonly _tools = new Map<string, McpTool>();
  private readonly _resources = new Map<string, McpResource>();
  private readonly _prompts = new Map<string, McpPrompt>();

  /** Register a tool; throws if a tool with the same name already exists. */
  registerTool(tool: McpTool): this {
    if (this._tools.has(tool.descriptor.name)) {
      throw new Error(`Tool already registered: ${tool.descriptor.name}`);
    }
    this._tools.set(tool.descriptor.name, tool);
    return this;
  }

  /** Register a resource; throws if the same uriTemplate is already registered. */
  registerResource(resource: McpResource): this {
    if (this._resources.has(resource.uriTemplate)) {
      throw new Error(`Resource already registered: ${resource.uriTemplate}`);
    }
    this._resources.set(resource.uriTemplate, resource);
    return this;
  }

  /** Register a prompt; throws if a prompt with the same name already exists. */
  registerPrompt(prompt: McpPrompt): this {
    if (this._prompts.has(prompt.name)) {
      throw new Error(`Prompt already registered: ${prompt.name}`);
    }
    this._prompts.set(prompt.name, prompt);
    return this;
  }

  /** Look up a tool by name; returns Err if not found. */
  getTool(name: string): Result<McpTool, McpToolNotFoundError> {
    const tool = this._tools.get(name);
    if (tool === undefined) return err(new McpToolNotFoundError(name));
    return ok(tool);
  }

  /** Look up a resource by URI; tries exact match then template prefix match. */
  getResource(uri: string): Result<McpResource, McpResourceNotFoundError> {
    // Exact template key match
    const direct = this._resources.get(uri);
    if (direct !== undefined) return ok(direct);

    // Template prefix match: strip the variable portion and compare base
    for (const [template, resource] of this._resources) {
      if (matchesTemplate(template, uri)) return ok(resource);
    }

    return err(new McpResourceNotFoundError(uri));
  }

  /** Look up a prompt by name; returns Err if not found. */
  getPrompt(name: string): Result<McpPrompt, McpPromptNotFoundError> {
    const prompt = this._prompts.get(name);
    if (prompt === undefined) return err(new McpPromptNotFoundError(name));
    return ok(prompt);
  }

  /** List all registered tools (ordered by registration). */
  listTools(): readonly McpTool[] {
    return Array.from(this._tools.values());
  }

  /** List all registered resources. */
  listResources(): readonly McpResource[] {
    return Array.from(this._resources.values());
  }

  /** List all registered prompts. */
  listPrompts(): readonly McpPrompt[] {
    return Array.from(this._prompts.values());
  }

  /** Return a snapshot of the full registry for capability negotiation. */
  snapshot(): RegistrySnapshot {
    return {
      tools: this.listTools(),
      resources: this.listResources(),
      prompts: this.listPrompts(),
    };
  }
}

/**
 * Naively checks whether a URI matches a URI template by converting `{...}`
 * placeholders into a wildcard regex segment.
 */
function matchesTemplate(template: string, uri: string): boolean {
  const escaped = template.replace(/[.+^${}()|[\]\\]/g, (ch) => {
    if (ch === "{") return "(?:[^/]+";
    if (ch === "}") return ")";
    return `\\${ch}`;
  });
  try {
    return new RegExp(`^${escaped}$`).test(uri);
  } catch {
    return false;
  }
}
