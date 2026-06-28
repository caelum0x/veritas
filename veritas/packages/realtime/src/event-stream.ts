// EventStream: async iterable stream of realtime events for a subscription.
import { newId } from "@veritas/core";
import type { RealtimeEvent } from "./types.js";

export interface EventStream extends AsyncIterable<RealtimeEvent> {
  readonly id: string;
  push(event: RealtimeEvent): void;
  close(): void;
  readonly closed: boolean;
}

export function createEventStream(): EventStream {
  const id = newId("stream");
  const queue: Array<RealtimeEvent> = [];
  const resolvers: Array<(value: IteratorResult<RealtimeEvent>) => void> = [];
  let closed = false;

  function drain(): void {
    while (queue.length > 0 && resolvers.length > 0) {
      const event = queue.shift()!;
      const resolve = resolvers.shift()!;
      resolve({ value: event, done: false });
    }
    if (closed && resolvers.length > 0) {
      const resolve = resolvers.shift()!;
      resolve({ value: undefined as unknown as RealtimeEvent, done: true });
    }
  }

  const stream: EventStream = {
    get id() { return id; },
    get closed() { return closed; },

    push(event: RealtimeEvent): void {
      if (closed) return;
      queue.push(event);
      drain();
    },

    close(): void {
      if (closed) return;
      closed = true;
      drain();
    },

    [Symbol.asyncIterator](): AsyncIterator<RealtimeEvent> {
      return {
        next(): Promise<IteratorResult<RealtimeEvent>> {
          if (queue.length > 0) {
            const event = queue.shift()!;
            return Promise.resolve({ value: event, done: false });
          }
          if (closed) {
            return Promise.resolve({ value: undefined as unknown as RealtimeEvent, done: true });
          }
          return new Promise<IteratorResult<RealtimeEvent>>((resolve) => {
            resolvers.push(resolve);
          });
        },
        return(): Promise<IteratorResult<RealtimeEvent>> {
          closed = true;
          drain();
          return Promise.resolve({ value: undefined as unknown as RealtimeEvent, done: true });
        },
      };
    },
  };

  return stream;
}
