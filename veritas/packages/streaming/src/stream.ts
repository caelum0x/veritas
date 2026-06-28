// Core data stream: publish/subscribe with backpressure via bounded buffer.
import { newId } from "@veritas/core";
import type { StreamEvent, StreamHandler } from "./types.js";
import { StreamClosedError } from "./errors.js";

export type StreamOptions = {
  readonly bufferSize?: number;
};

export class Stream<T = unknown> {
  readonly id: string;
  private readonly subscribers = new Map<string, StreamHandler<T>>();
  private closed = false;
  private readonly buffer: Array<StreamEvent<T>> = [];
  private readonly bufferSize: number;

  constructor(options: StreamOptions = {}) {
    this.id = newId("stream");
    this.bufferSize = options.bufferSize ?? 1024;
  }

  subscribe(handler: StreamHandler<T>): () => void {
    const subId = newId("sub");
    this.subscribers.set(subId, handler);
    // Replay buffered events to new subscriber
    for (const event of this.buffer) {
      void handler(event);
    }
    return () => { this.subscribers.delete(subId); };
  }

  async publish(payload: T, key?: string): Promise<void> {
    if (this.closed) throw new StreamClosedError(this.id);
    const event: StreamEvent<T> = {
      id: newId("evt"),
      timestamp: Date.now(),
      key,
      payload,
    };
    if (this.buffer.length >= this.bufferSize) {
      this.buffer.shift(); // drop oldest when full
    }
    this.buffer.push(event);
    const promises: Array<Promise<void>> = [];
    for (const handler of this.subscribers.values()) {
      const result = handler(event);
      if (result instanceof Promise) promises.push(result);
    }
    if (promises.length > 0) await Promise.all(promises);
  }

  close(): void {
    this.closed = true;
    this.subscribers.clear();
  }

  isClosed(): boolean {
    return this.closed;
  }

  bufferSnapshot(): ReadonlyArray<StreamEvent<T>> {
    return [...this.buffer];
  }

  subscriberCount(): number {
    return this.subscribers.size;
  }
}

export function createStream<T = unknown>(options?: StreamOptions): Stream<T> {
  return new Stream<T>(options);
}
