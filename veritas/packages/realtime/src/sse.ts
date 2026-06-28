// SSE port: Server-Sent Events transport for realtime event delivery over HTTP.
import type { IncomingMessage, ServerResponse } from "node:http";
import { createLogger } from "@veritas/observability";
import type { RealtimeEvent } from "./types.js";
import { createEventStream } from "./event-stream.js";
import type { EventStream } from "./event-stream.js";

const log = createLogger({ bindings: { module: "realtime:sse" } });

export interface SseConnection {
  readonly id: string;
  readonly stream: EventStream;
  close(): void;
}

export interface SsePortOptions {
  readonly heartbeatIntervalMs?: number;
  readonly retryMs?: number;
}

const DEFAULT_HEARTBEAT_MS = 30_000;
const DEFAULT_RETRY_MS = 3_000;

function formatSseEvent(event: RealtimeEvent, retryMs: number): string {
  const lines: string[] = [
    `retry: ${retryMs}`,
    `id: ${event.id}`,
    `event: ${event.type}`,
    `data: ${JSON.stringify(event.payload)}`,
    "",
    "",
  ];
  return lines.join("\n");
}

function formatHeartbeat(): string {
  return ": heartbeat\n\n";
}

export function createSseConnection(
  req: IncomingMessage,
  res: ServerResponse,
  connectionId: string,
  opts: SsePortOptions = {}
): SseConnection {
  const heartbeatMs = opts.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_MS;
  const retryMs = opts.retryMs ?? DEFAULT_RETRY_MS;
  const stream = createEventStream();

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  const heartbeatTimer = setInterval(() => {
    if (!res.writableEnded) {
      res.write(formatHeartbeat());
    }
  }, heartbeatMs);

  const pump = async (): Promise<void> => {
    try {
      for await (const event of stream) {
        if (res.writableEnded) break;
        res.write(formatSseEvent(event, retryMs));
      }
    } catch (e: unknown) {
      log.error("SSE pump error", { err: e, connectionId });
    } finally {
      clearInterval(heartbeatTimer);
      if (!res.writableEnded) res.end();
    }
  };

  void pump();

  req.on("close", () => {
    stream.close();
    clearInterval(heartbeatTimer);
    log.info("SSE client disconnected", { connectionId });
  });

  return {
    get id() { return connectionId; },
    get stream() { return stream; },
    close() {
      stream.close();
      clearInterval(heartbeatTimer);
      if (!res.writableEnded) res.end();
    },
  };
}
