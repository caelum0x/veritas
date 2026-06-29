// MCP server core: wires transport, registry, and request handler together.

import { noopLogger, isErr } from "@veritas/core";
import type { Logger } from "@veritas/core";
import type { McpTransport } from "./transport.js";
import type { McpTool } from "./tool.js";
import type { McpResource } from "./resource.js";
import type { McpPrompt } from "./prompt.js";
import type { ServerCapabilities } from "./capabilities.js";
import {
  rpcSuccess,
  rpcError,
  RPC_METHOD_NOT_FOUND,
  RPC_INTERNAL_ERROR,
  RPC_INVALID_PARAMS,
  MCP_TOOL_ERROR,
  MCP_RESOURCE_ERROR,
} from "./protocol.js";
import type { JsonRpcRequest, JsonRpcResponse } from "./protocol.js";

const PROTOCOL_VERSION = "2024-11-05";

type JsonRpcId = string | number | null;

export interface McpServerOptions {
  readonly name: string;
  readonly version: string;
  readonly transport: McpTransport;
  readonly tools?: readonly McpTool[];
  readonly resources?: readonly McpResource[];
  readonly prompts?: readonly McpPrompt[];
  readonly logger?: Logger;
}

/** MCP server: dispatches JSON-RPC 2.0 messages from the transport to handlers. */
export class McpServer {
  private readonly name: string;
  private readonly version: string;
  private readonly transport: McpTransport;
  private readonly tools: ReadonlyMap<string, McpTool>;
  private readonly resources: readonly McpResource[];
  private readonly prompts: ReadonlyMap<string, McpPrompt>;
  private readonly logger: Logger;

  constructor(opts: McpServerOptions) {
    this.name = opts.name;
    this.version = opts.version;
    this.transport = opts.transport;
    this.logger = opts.logger ?? noopLogger;

    const toolMap = new Map<string, McpTool>();
    for (const t of opts.tools ?? []) {
      toolMap.set(t.descriptor.name, t);
    }
    this.tools = toolMap;

    this.resources = opts.resources ?? [];

    const promptMap = new Map<string, McpPrompt>();
    for (const p of opts.prompts ?? []) {
      promptMap.set(p.name, p);
    }
    this.prompts = promptMap;
  }

  /** Start accepting requests from the transport. */
  async start(): Promise<void> {
    this.logger.info("McpServer starting", { name: this.name, version: this.version });
    await this.transport.start(this.handle.bind(this));
  }

  /** Stop the server. */
  async stop(): Promise<void> {
    this.logger.info("McpServer stopping");
    await this.transport.stop();
  }

  /** Route a single JSON-RPC request to the appropriate method handler. */
  private async handle(req: JsonRpcRequest): Promise<JsonRpcResponse> {
    const id: JsonRpcId = req.id ?? null;
    try {
      switch (req.method) {
        case "initialize":
          return this.handleInitialize(id);
        case "tools/list":
          return this.handleToolsList(id);
        case "tools/call":
          return this.handleToolsCall(id, req.params);
        case "resources/list":
          return this.handleResourcesList(id);
        case "resources/read":
          return this.handleResourcesRead(id, req.params);
        case "prompts/list":
          return this.handlePromptsList(id);
        case "prompts/get":
          return this.handlePromptsGet(id, req.params);
        default:
          return rpcError(id, RPC_METHOD_NOT_FOUND, `Unknown method: ${req.method}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Internal server error";
      this.logger.error("Unhandled error in McpServer.handle", { error: msg });
      return rpcError(id, RPC_INTERNAL_ERROR, msg);
    }
  }

  private handleInitialize(id: JsonRpcId): JsonRpcResponse {
    const capabilities: ServerCapabilities = {
      tools: this.tools.size > 0 ? { listChanged: false } : undefined,
      resources: this.resources.length > 0
        ? { subscribe: false, listChanged: false }
        : undefined,
      prompts: this.prompts.size > 0 ? { listChanged: false } : undefined,
      logging: {},
    };
    return rpcSuccess(id, {
      protocolVersion: PROTOCOL_VERSION,
      serverInfo: { name: this.name, version: this.version },
      capabilities,
    });
  }

  private handleToolsList(id: JsonRpcId): JsonRpcResponse {
    const tools = [...this.tools.values()].map((t) => t.descriptor);
    return rpcSuccess(id, { tools });
  }

  private async handleToolsCall(id: JsonRpcId, params: unknown): Promise<JsonRpcResponse> {
    const p = params as Record<string, unknown> | undefined;
    const toolName = p?.name;
    if (typeof toolName !== "string") {
      return rpcError(id, RPC_INVALID_PARAMS, "Missing required param: name");
    }

    const tool = this.tools.get(toolName);
    if (!tool) {
      return rpcError(id, MCP_TOOL_ERROR, `Tool not found: ${toolName}`);
    }

    const parseResult = tool.parse(p?.arguments ?? {});
    if (isErr(parseResult)) {
      return rpcError(id, RPC_INVALID_PARAMS, parseResult.error.message);
    }

    const execResult = await tool.execute(parseResult.value);
    if (isErr(execResult)) {
      return rpcError(id, MCP_TOOL_ERROR, execResult.error.message);
    }

    return rpcSuccess(id, execResult.value);
  }

  private async handleResourcesList(id: JsonRpcId): Promise<JsonRpcResponse> {
    const items = await Promise.all(
      this.resources.map((r) =>
        r.list().then((list) =>
          list.map((item) => ({
            uri: item.uri,
            name: item.name,
            description: item.description,
            mimeType: item.mimeType,
          })),
        ),
      ),
    );
    return rpcSuccess(id, { resources: items.flat() });
  }

  private async handleResourcesRead(id: JsonRpcId, params: unknown): Promise<JsonRpcResponse> {
    const p = params as Record<string, unknown> | undefined;
    const uri = p?.uri;
    if (typeof uri !== "string") {
      return rpcError(id, RPC_INVALID_PARAMS, "Missing required param: uri");
    }

    // Find the resource whose uriTemplate matches the requested uri prefix
    const resource = this.resources.find((r) => {
      const base = r.uriTemplate.split("{")[0] ?? r.uriTemplate;
      return uri.startsWith(base);
    });
    if (!resource) {
      return rpcError(id, MCP_RESOURCE_ERROR, `No resource handles URI: ${uri}`);
    }

    try {
      const result = await resource.read(uri);
      return rpcSuccess(id, { contents: result.contents });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Resource read failed";
      return rpcError(id, MCP_RESOURCE_ERROR, msg);
    }
  }

  private handlePromptsList(id: JsonRpcId): JsonRpcResponse {
    const prompts = [...this.prompts.values()].map((p) => ({
      name: p.name,
      description: p.description,
      arguments: p.arguments,
    }));
    return rpcSuccess(id, { prompts });
  }

  private async handlePromptsGet(id: JsonRpcId, params: unknown): Promise<JsonRpcResponse> {
    const p = params as Record<string, unknown> | undefined;
    const name = p?.name;
    if (typeof name !== "string") {
      return rpcError(id, RPC_INVALID_PARAMS, "Missing required param: name");
    }
    const prompt = this.prompts.get(name);
    if (!prompt) {
      return rpcError(id, RPC_METHOD_NOT_FOUND, `Prompt not found: ${name}`);
    }

    const args = (p?.arguments ?? {}) as Record<string, string>;
    try {
      const result = await prompt.render(args);
      return rpcSuccess(id, result);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Prompt render failed";
      return rpcError(id, RPC_INTERNAL_ERROR, msg);
    }
  }
}
