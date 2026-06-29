// WebSocket port interface and in-memory/console implementation for realtime transport.

import type { RealtimeEvent, SerializedFrame } from "./types.js";

export interface WebSocketClient {
  readonly id: string;
  readonly isAlive: boolean;
  send(frame: SerializedFrame): void;
  close(code?: number, reason?: string): void;
  onMessage(handler: (data: string) => void): void;
  onClose(handler: (code: number, reason: string) => void): void;
  ping(): void;
}

export interface WebSocketPort {
  onConnect(handler: (client: WebSocketClient) => void): void;
  broadcast(frame: SerializedFrame, excludeId?: string): void;
  clientCount(): number;
  close(): void;
}

export interface WebSocketPortOptions {
  readonly maxPayloadBytes?: number;
}

class InMemoryWebSocketClient implements WebSocketClient {
  readonly id: string;
  isAlive: boolean = true;

  private messageHandlers: Array<(data: string) => void> = [];
  private closeHandlers: Array<(code: number, reason: string) => void> = [];
  private sentFrames: SerializedFrame[] = [];

  constructor(id: string) {
    this.id = id;
  }

  send(frame: SerializedFrame): void {
    this.sentFrames.push(frame);
  }

  close(code: number = 1000, reason: string = ""): void {
    this.isAlive = false;
    for (const handler of this.closeHandlers) {
      handler(code, reason);
    }
  }

  onMessage(handler: (data: string) => void): void {
    this.messageHandlers.push(handler);
  }

  onClose(handler: (code: number, reason: string) => void): void {
    this.closeHandlers.push(handler);
  }

  ping(): void {
    // no-op for in-memory implementation
  }

  getSentFrames(): readonly SerializedFrame[] {
    return this.sentFrames;
  }

  simulateMessage(data: string): void {
    for (const handler of this.messageHandlers) {
      handler(data);
    }
  }
}

export class InMemoryWebSocketPort implements WebSocketPort {
  private clients: Map<string, InMemoryWebSocketClient> = new Map();
  private connectHandlers: Array<(client: WebSocketClient) => void> = [];

  onConnect(handler: (client: WebSocketClient) => void): void {
    this.connectHandlers.push(handler);
  }

  broadcast(frame: SerializedFrame, excludeId?: string): void {
    for (const [id, client] of this.clients) {
      if (id !== excludeId && client.isAlive) {
        client.send(frame);
      }
    }
  }

  clientCount(): number {
    return this.clients.size;
  }

  close(): void {
    for (const client of this.clients.values()) {
      client.close(1001, "server closing");
    }
    this.clients.clear();
  }

  simulateConnection(clientId: string): InMemoryWebSocketClient {
    const client = new InMemoryWebSocketClient(clientId);
    this.clients.set(clientId, client);
    client.onClose(() => {
      this.clients.delete(clientId);
    });
    for (const handler of this.connectHandlers) {
      handler(client);
    }
    return client;
  }

  getClient(id: string): InMemoryWebSocketClient | undefined {
    return this.clients.get(id);
  }
}

export function createInMemoryWebSocketPort(
  _options?: WebSocketPortOptions
): InMemoryWebSocketPort {
  return new InMemoryWebSocketPort();
}

export function buildEventFrame(event: RealtimeEvent): SerializedFrame {
  return { type: "event", data: JSON.stringify(event) };
}
