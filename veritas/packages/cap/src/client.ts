// AgentClient factory: constructs a CAP WebSocket client from CapProviderConfig.

import { noopLogger } from "@veritas/core";
import type { Logger } from "@veritas/core";
import type { CapProviderConfig } from "./types.js";

/** Minimal interface the CAP event loop uses to communicate with the agent network. */
export interface AgentClient {
  /** Connect (or reconnect) to the agent relay. Resolves when the socket is open. */
  connect(): Promise<void>;
  /** Gracefully close the connection. */
  close(): Promise<void>;
  /** Send a raw JSON-serialisable message to the relay. */
  send(message: unknown): Promise<void>;
  /** Register a listener for incoming messages. Returns an unsubscribe function. */
  onMessage(handler: (raw: unknown) => void): () => void;
  /** Register a listener for connection-close events. */
  onClose(handler: (code: number, reason: string) => void): () => void;
  /** True when the underlying socket is in the OPEN state. */
  readonly isConnected: boolean;
}

/** Internal WebSocket-backed implementation of AgentClient. */
class WebSocketAgentClient implements AgentClient {
  private readonly url: string;
  private readonly agentId: string;
  private readonly privateKey: string;
  private readonly logger: Logger;

  private ws: WebSocket | null = null;
  private messageHandlers: Array<(raw: unknown) => void> = [];
  private closeHandlers: Array<(code: number, reason: string) => void> = [];

  constructor(config: CapProviderConfig, logger: Logger) {
    this.url = config.agentUrl;
    this.agentId = config.agentId;
    this.privateKey = config.privateKey;
    this.logger = logger;
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.url);

      ws.onopen = () => {
        this.ws = ws;
        this.logger.info("cap:client connected", { url: this.url, agentId: this.agentId });
        // Send auth handshake immediately upon connection.
        void ws.send(
          JSON.stringify({ type: "AUTH", agentId: this.agentId, key: this.privateKey }),
        );
        resolve();
      };

      ws.onerror = (ev) => {
        this.logger.error("cap:client socket error", { event: String(ev) });
        reject(new Error(`WebSocket error connecting to ${this.url}`));
      };

      ws.onmessage = (ev: MessageEvent) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(ev.data as string);
        } catch {
          parsed = ev.data;
        }
        for (const h of this.messageHandlers) h(parsed);
      };

      ws.onclose = (ev: { code: number; reason: string }) => {
        this.ws = null;
        this.logger.warn("cap:client disconnected", { code: ev.code, reason: ev.reason });
        for (const h of this.closeHandlers) h(ev.code, ev.reason);
      };
    });
  }

  async close(): Promise<void> {
    if (this.ws !== null) {
      this.ws.close(1000, "provider shutdown");
      this.ws = null;
    }
  }

  async send(message: unknown): Promise<void> {
    if (!this.isConnected || this.ws === null) {
      throw new Error("AgentClient: cannot send — socket is not connected.");
    }
    this.ws.send(JSON.stringify(message));
  }

  onMessage(handler: (raw: unknown) => void): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  onClose(handler: (code: number, reason: string) => void): () => void {
    this.closeHandlers.push(handler);
    return () => {
      this.closeHandlers = this.closeHandlers.filter((h) => h !== handler);
    };
  }
}

/** Create a new AgentClient from the supplied provider configuration. */
export function createAgentClient(
  config: CapProviderConfig,
  logger: Logger = noopLogger,
): AgentClient {
  return new WebSocketAgentClient(config, logger);
}
