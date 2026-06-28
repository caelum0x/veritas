// Transport port: abstracts stdio vs HTTP message delivery for MCP.

import type { JsonRpcRequest, JsonRpcResponse } from "./protocol.js";

/** Handler invoked for each incoming request; returns the response. */
export type RequestHandler = (
  req: JsonRpcRequest,
) => Promise<JsonRpcResponse>;

/** Port interface for an MCP transport layer. */
export interface McpTransport {
  /** Start listening and dispatch to handler. */
  readonly start: (handler: RequestHandler) => Promise<void>;
  /** Gracefully stop the transport. */
  readonly stop: () => Promise<void>;
}

/** Stdio transport: reads newline-delimited JSON from stdin, writes to stdout. */
export function stdioTransport(): McpTransport {
  let running = false;

  async function start(handler: RequestHandler): Promise<void> {
    running = true;
    process.stdin.setEncoding("utf8");
    let buffer = "";

    await new Promise<void>((resolve) => {
      process.stdin.on("data", (chunk: string) => {
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          void (async () => {
            try {
              const parsed: unknown = JSON.parse(trimmed);
              const req = parsed as JsonRpcRequest;
              const res = await handler(req);
              process.stdout.write(JSON.stringify(res) + "\n");
            } catch {
              // Ignore malformed lines
            }
          })();
        }
      });

      process.stdin.on("end", () => {
        running = false;
        resolve();
      });

      process.stdin.on("error", () => {
        running = false;
        resolve();
      });
    });
  }

  async function stop(): Promise<void> {
    running = false;
    process.stdin.destroy();
  }

  return { start, stop };
}

/** In-memory transport: useful for testing; send/receive via returned interface. */
export interface InMemoryTransport extends McpTransport {
  /** Send a request and receive the response. */
  readonly send: (req: JsonRpcRequest) => Promise<JsonRpcResponse>;
}

export function inMemoryTransport(): InMemoryTransport {
  let _handler: RequestHandler | null = null;

  async function start(handler: RequestHandler): Promise<void> {
    _handler = handler;
  }

  async function stop(): Promise<void> {
    _handler = null;
  }

  async function send(req: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (!_handler) throw new Error("Transport not started");
    return _handler(req);
  }

  return { start, stop, send };
}
