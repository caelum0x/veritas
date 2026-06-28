// Stream operators: map, filter, flatMap, dedupe, throttle for transforming events.
import type { StreamEvent, StreamHandler } from "./types.js";

export type Operator<In, Out> = (
  handler: StreamHandler<Out>
) => StreamHandler<In>;

/** Maps each event payload with a transform function. */
export function mapOp<In, Out>(
  fn: (payload: In) => Out
): Operator<In, Out> {
  return (handler) => async (event) => {
    const mapped: StreamEvent<Out> = {
      id: event.id,
      timestamp: event.timestamp,
      key: event.key,
      payload: fn(event.payload as In),
    };
    await handler(mapped);
  };
}

/** Filters events by predicate; drops events where predicate returns false. */
export function filterOp<T>(
  predicate: (payload: T) => boolean
): Operator<T, T> {
  return (handler) => async (event) => {
    if (predicate(event.payload as T)) {
      await handler(event as StreamEvent<T>);
    }
  };
}

/** FlatMaps each event payload to zero or more output events. */
export function flatMapOp<In, Out>(
  fn: (payload: In) => ReadonlyArray<Out>
): Operator<In, Out> {
  return (handler) => async (event) => {
    const outputs = fn(event.payload as In);
    for (const payload of outputs) {
      const out: StreamEvent<Out> = {
        id: event.id,
        timestamp: event.timestamp,
        key: event.key,
        payload,
      };
      await handler(out);
    }
  };
}

/** Deduplicates events by key within a given windowMs. */
export function dedupeOp<T>(windowMs: number): Operator<T, T> {
  const seen = new Map<string, number>();
  return (handler) => async (event) => {
    const dedupeKey = event.key ?? event.id;
    const last = seen.get(dedupeKey);
    const now = event.timestamp;
    if (last !== undefined && now - last < windowMs) return;
    seen.set(dedupeKey, now);
    // Evict stale entries
    for (const [k, ts] of seen) {
      if (now - ts >= windowMs) seen.delete(k);
    }
    await handler(event as StreamEvent<T>);
  };
}

/** Throttles events per key to at most one per intervalMs. */
export function throttleOp<T>(intervalMs: number): Operator<T, T> {
  const lastEmit = new Map<string, number>();
  return (handler) => async (event) => {
    const k = event.key ?? "__global__";
    const last = lastEmit.get(k) ?? -Infinity;
    if (event.timestamp - last < intervalMs) return;
    lastEmit.set(k, event.timestamp);
    await handler(event as StreamEvent<T>);
  };
}

/** Composes multiple operators left-to-right (first operator applied first). */
export function compose<A, B, C>(
  op1: Operator<A, B>,
  op2: Operator<B, C>
): Operator<A, C> {
  return (handler) => op1(op2(handler));
}
