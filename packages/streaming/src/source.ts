// Stream source port and in-memory implementations for feeding events into streams.
import { newId } from "@veritas/core";
import type { StreamEvent, StreamHandler } from "./types.js";
import { StreamClosedError } from "./errors.js";

export interface StreamSource<T> {
  readonly id: string;
  start(handler: StreamHandler<T>): Promise<void>;
  stop(): Promise<void>;
}

/** Emits a fixed array of events then stops. */
export class ArraySource<T> implements StreamSource<T> {
  readonly id: string;
  private stopped = false;

  constructor(
    private readonly events: ReadonlyArray<StreamEvent<T>>,
    id?: string
  ) {
    this.id = id ?? newId("src");
  }

  async start(handler: StreamHandler<T>): Promise<void> {
    this.stopped = false;
    for (const event of this.events) {
      if (this.stopped) break;
      await handler(event);
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
  }
}

/** Emits events pushed via the push() method; blocks until stopped. */
export class PushSource<T> implements StreamSource<T> {
  readonly id: string;
  private handler: StreamHandler<T> | undefined;
  private closed = false;
  private readonly queue: Array<StreamEvent<T>> = [];
  private drainResolve: (() => void) | undefined;

  constructor(id?: string) {
    this.id = id ?? newId("src");
  }

  async push(payload: T, key?: string): Promise<void> {
    if (this.closed) throw new StreamClosedError(this.id);
    const event: StreamEvent<T> = {
      id: newId("evt"),
      timestamp: Date.now(),
      key,
      payload,
    };
    if (this.handler) {
      await this.handler(event);
    } else {
      this.queue.push(event);
    }
  }

  async start(handler: StreamHandler<T>): Promise<void> {
    this.handler = handler;
    this.closed = false;
    // Drain buffered events
    for (const event of this.queue.splice(0)) {
      await handler(event);
    }
    // Wait until stopped
    await new Promise<void>((resolve) => {
      this.drainResolve = resolve;
    });
  }

  async stop(): Promise<void> {
    this.closed = true;
    this.drainResolve?.();
  }
}

/** Emits events at a fixed interval using a generator function. */
export class IntervalSource<T> implements StreamSource<T> {
  readonly id: string;
  private stopped = false;

  constructor(
    private readonly generate: () => T,
    private readonly intervalMs: number,
    id?: string
  ) {
    this.id = id ?? newId("src");
  }

  async start(handler: StreamHandler<T>): Promise<void> {
    this.stopped = false;
    while (!this.stopped) {
      const event: StreamEvent<T> = {
        id: newId("evt"),
        timestamp: Date.now(),
        payload: this.generate(),
      };
      await handler(event);
      await new Promise<void>((r) => setTimeout(r, this.intervalMs));
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
  }
}
