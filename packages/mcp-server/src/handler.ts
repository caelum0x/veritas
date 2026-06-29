// RequestHandler — routes MCP JSON-RPC requests to tools, resources, and prompts.
import { isOk, isErr, toAppError } from "@veritas/core";
import type { Logger } from "@veritas/core";
import { noopLogger } from "@veritas/core";
import type { JsonRpcRequest, JsonRpcResponse } from "./protocol.js";
import { rpcSuccess, rpcError, RPC_INTERNAL_ERROR, RPC_METHOD_NOT_FOUND } from "./protocol.js";
import type { ToolResourceRegistry } from "./registry.js";
import {
  isMcpError,
  McpParseError,
  McpMethodNotFoundError,
  McpInvalidParamsError,
  MCP_ERROR_CODES,
  buildMcpErrorPayload,
} from "./errors.js";
import { buildCapabilities } from "./capabilities.js";
import { MCP_PROTOCOL_VERSION } from "./types.js";

export interface HandlerOptions {
  readonly registry: ToolResourceRegistry;
  readonly serverName: string;
  readonly serverVersion: string;
  readonly logger?: Logger;
}

/** MCP request handler: routes JSON-RPC 2.0 method calls to the registry. */
export class RequestHandler {
  private readonly registry: ToolResourceRegistry;
  private readonly serverName: string;
  private readonly serverVersion: string;
  private readonly logger: Logger;

  constructor(opts: HandlerOptions) {
    this.registry = opts.registry;
    this.serverName = opts.serverName;
    this.serverVersion = opts.serverVersion;
    this.logger = opts.logger ?? noopLogger;
  }

  /** Handle a single JSON-RPC request and return a JSON-RPC response. */
  async handle(req: JsonRpcRequest): Promise<JsonRpcResponse> {
    const id = req.id ?? null;
    this.logger.info("mcp.request", { method: req.method, id });

    try {
      const result = await this.dispatch(req);
      this.logger.info("mcp.response", { method: req.method, id });
      return rpcSuccess(id, result);
    } catch (thrown: unknown) {
      const appErr = toAppError(thrown);
      if (isMcpError(appErr)) {
        const payload = buildMcpErrorPayload(appErr);
        this.logger.warn("mcp.error", { method: req.method, code: payload.code, message: payload.message });
        return rpcError(id, payload.code, payload.message, payload.data);
      }
      this.logger.error("mcp.internal_error", { method: req.method, message: appErr.message });
      return rpcError(id, RPC_INTERNAL_ERROR, appErr.message);
    }
  }

  private async dispatch(req: JsonRpcRequest): Promise<unknown> {
    switch (req.method) {
      case "initialize":
        return this.handleInitialize();

      case "tools/list":
        return this.handleToolsList();

      case "tools/call":
        return this.handleToolsCall(req.params);

      case "resources/list":
        return this.handleResourcesList();

      case "resources/read":
        return this.handleResourcesRead(req.params);

      case "prompts/list":
        return this.handlePromptsList();

      case "prompts/get":
        return this.handlePromptsGet(req.params);

      case "ping":
        return {};

      default:
        throw new McpMethodNotFoundError(req.method);
    }
  }

  private handleInitialize(): unknown {
    return {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: buildCapabilities(),
      serverInfo: { name: this.serverName, version: this.serverVersion },
    };
  }

  private handleToolsList(): unknown {
    const tools = this.registry.listTools();
    return {
      tools: tools.map((t) => ({
        name: t.descriptor.name,
        description: t.descriptor.description,
        inputSchema: t.descriptor.inputSchema,
      })),
    };
  }

  private async handleToolsCall(params: unknown): Promise<unknown> {
    const p = asRecord(params);
    const name = asString(p["name"], "name");
    const toolInput: unknown = p["arguments"] ?? {};

    const toolResult = this.registry.getTool(name);
    if (isErr(toolResult)) throw toolResult.error;

    const tool = toolResult.value;
    const result = await tool.execute(toolInput);
    return result;
  }

  private async handleResourcesList(): Promise<unknown> {
    const resources = this.registry.listResources();
    const items = await Promise.all(resources.map((r) => r.list()));
    return { resources: items.flat() };
  }

  private async handleResourcesRead(params: unknown): Promise<unknown> {
    const p = asRecord(params);
    const uri = asString(p["uri"], "uri");

    const resourceResult = this.registry.getResource(uri);
    if (isErr(resourceResult)) throw resourceResult.error;

    return resourceResult.value.read(uri);
  }

  private handlePromptsList(): unknown {
    const prompts = this.registry.listPrompts();
    return {
      prompts: prompts.map((p) => ({
        name: p.name,
        description: p.description,
        arguments: p.arguments,
      })),
    };
  }

  private async handlePromptsGet(params: unknown): Promise<unknown> {
    const p = asRecord(params);
    const name = asString(p["name"], "name");
    const args = (p["arguments"] ?? {}) as Record<string, string>;

    const promptResult = this.registry.getPrompt(name);
    if (isErr(promptResult)) throw promptResult.error;

    return promptResult.value.render(args);
  }
}

/** Coerce unknown to Record<string, unknown>; throws McpInvalidParamsError on failure. */
function asRecord(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new McpInvalidParamsError("params must be an object");
}

/** Extract a required string field; throws McpInvalidParamsError if missing/wrong type. */
function asString(value: unknown, field: string): string {
  if (typeof value === "string") return value;
  throw new McpInvalidParamsError(`params.${field} must be a string`);
}
