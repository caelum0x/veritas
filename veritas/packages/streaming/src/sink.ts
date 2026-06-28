// Stream sink port and in-memory implementations for consuming stream events.
import { newId } from "@veritas/core";
import type { StreamEvent, StreamHandler } from "./types.js";
import { StreamClosedError } from "./errors.js";

export interface StreamSink<T> {
  readonly id: string;
  handler(): StreamHandler<T>;
  close(): Promise<void>;
}

/** Collects all received events into an array for inspection. */
export class CollectSink<T> implements StreamSink<T> {
  readonly id: string;
  private readonly collected: Array<StreamEvent<T>> = [];
  private closed = false;

  constructor(id?: string) {
    this.id = id ?? newId("sink");
  }

  handler(): StreamHandler<T> {
    return async (event) => {
      if (this.closed) throw new StreamClosedError(this.id);
      this.collected.push(event);
    };
  }

  events(): ReadonlyArray<StreamEvent<T>> {
    return this.collected;
  }

  payloads(): ReadonlyArray<T> {
    return this.collected.map((e) => e.payload as T);
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

/** Calls a user-provided callback for each received event. */
export class CallbackSink<T> implements StreamSink<T> {
  readonly id: string;
  private closed = false;

  constructor(
    private readonly fn: (event: StreamEvent<T>) => Promise<void> | void,
    id?: string
  ) {
    this.id = id ?? newId("sink");
  }

  handler(): StreamHandler<T> {
    return async (event) => {
      if (this.closed) throw new StreamClosedError(this.id);
      await this.fn(event);
    };
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

/** Drops all events (null sink); useful for benchmarking or draining. */
export class NullSink<T> implements StreamSink<T> {
  readonly id: string;

  constructor(id?: string) {
    this.id = id ?? newId("sink");
  }

  handler(): StreamHandler<T> {
    return async (_event) => {
      // intentionally discard
    };
  }

  async close(): Promise<void> {
    // nothing to close
  }
}

/** Buffers up to maxSize events, dropping oldest on overflow (ring buffer). */
export class RingBufferSink<T> implements StreamSink<T> {
  readonly id: string;
  private readonly buffer: Array<StreamEvent<T>> = [];
  private closed = false;

  constructor(
    private readonly maxSize: number,
    id?: string
  ) {
    this.id = id ?? newId("sink");
  }

  handler(): StreamHandler<T> {
    return async (event) => {
      if (this.closed) throw new StreamClosedError(this.id);
      if (this.buffer.length >= this.maxSize) {
        this.buffer.shift();
      }
      this.buffer.push(event);
    };
  }

  snapshot(): ReadonlyArray<StreamEvent<T>> {
    return [...this.buffer];
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}
