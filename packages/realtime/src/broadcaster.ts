// Broadcaster: fans out RealtimeMessages to subscribed WebSocket clients and SSE streams.

import type { RealtimeMessage, SerializedFrame } from "./types.js";
import type { WebSocketPort } from "./websocket-port.js";

export interface SseStream {
  readonly id: string;
  write(frame: SerializedFrame): void;
  close(): void;
}

export interface BroadcasterPort {
  addWebSocketPort(port: WebSocketPort): void;
  addSseStream(stream: SseStream): void;
  removeSseStream(id: string): void;
  broadcast(message: RealtimeMessage): void;
  broadcastToChannel(channelId: string, message: RealtimeMessage): void;
  shutdown(): void;
}

interface ChannelSubscribers {
  readonly wsPortIds: Set<string>;
  readonly sseStreamIds: Set<string>;
}

export class Broadcaster implements BroadcasterPort {
  private wsPorts: Map<string, WebSocketPort> = new Map();
  private sseStreams: Map<string, SseStream> = new Map();
  private channelSubscribers: Map<string, ChannelSubscribers> = new Map();
  private portIdCounter = 0;

  addWebSocketPort(port: WebSocketPort): void {
    const portId = `ws-${++this.portIdCounter}`;
    this.wsPorts.set(portId, port);
  }

  addSseStream(stream: SseStream): void {
    this.sseStreams.set(stream.id, stream);
  }

  removeSseStream(id: string): void {
    this.sseStreams.delete(id);
    for (const [, subs] of this.channelSubscribers) {
      subs.sseStreamIds.delete(id);
    }
  }

  subscribeStreamToChannel(streamId: string, channelId: string): void {
    const subs = this.getOrCreateChannelSubs(channelId);
    const updated: ChannelSubscribers = {
      wsPortIds: subs.wsPortIds,
      sseStreamIds: new Set([...subs.sseStreamIds, streamId]),
    };
    this.channelSubscribers.set(channelId, updated);
  }

  broadcast(message: RealtimeMessage): void {
    const frame = this.toFrame(message);
    for (const port of this.wsPorts.values()) {
      port.broadcast(frame);
    }
    for (const stream of this.sseStreams.values()) {
      stream.write(frame);
    }
  }

  broadcastToChannel(channelId: string, message: RealtimeMessage): void {
    const subs = this.channelSubscribers.get(channelId);
    if (subs === undefined) return;

    const frame = this.toFrame(message);

    for (const portId of subs.wsPortIds) {
      const port = this.wsPorts.get(portId);
      if (port !== undefined) {
        port.broadcast(frame);
      }
    }

    for (const streamId of subs.sseStreamIds) {
      const stream = this.sseStreams.get(streamId);
      if (stream !== undefined) {
        stream.write(frame);
      }
    }
  }

  shutdown(): void {
    for (const port of this.wsPorts.values()) {
      port.close();
    }
    for (const stream of this.sseStreams.values()) {
      stream.close();
    }
    this.wsPorts.clear();
    this.sseStreams.clear();
    this.channelSubscribers.clear();
  }

  private toFrame(message: RealtimeMessage): SerializedFrame {
    return { type: "event", data: JSON.stringify(message) };
  }

  private getOrCreateChannelSubs(channelId: string): ChannelSubscribers {
    const existing = this.channelSubscribers.get(channelId);
    if (existing !== undefined) return existing;
    const created: ChannelSubscribers = {
      wsPortIds: new Set(),
      sseStreamIds: new Set(),
    };
    this.channelSubscribers.set(channelId, created);
    return created;
  }
}

export function createBroadcaster(): Broadcaster {
  return new Broadcaster();
}
