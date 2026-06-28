// Transforms raw CdcEvents into domain-specific shapes via composable pipelines.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { CdcEvent } from "./change-event.js";
import type { CdcError } from "./errors.js";
import { cdcError } from "./errors.js";

/** A single transformation step from one event shape to another */
export type EventTransformer<TIn = CdcEvent, TOut = CdcEvent> = (
  event: TIn,
) => Result<TOut, CdcError>;

/** A typed async transformation step */
export type AsyncEventTransformer<TIn = CdcEvent, TOut = CdcEvent> = (
  event: TIn,
) => Promise<Result<TOut, CdcError>>;

/** Wrap any throwing function as an EventTransformer */
export function safeTransform<TIn, TOut>(
  fn: (event: TIn) => TOut,
): EventTransformer<TIn, TOut> {
  return (event: TIn): Result<TOut, CdcError> => {
    try {
      return ok(fn(event));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return err(cdcError("TRANSFORM_FAILED", `Transform error: ${msg}`, { input: event as Record<string, unknown> }));
    }
  };
}

/** Compose two sync transformers left-to-right */
export function composeTransformers<A, B, C>(
  first: EventTransformer<A, B>,
  second: EventTransformer<B, C>,
): EventTransformer<A, C> {
  return (event: A): Result<C, CdcError> => {
    const r = first(event);
    if (!r.ok) return r;
    return second(r.value);
  };
}

/** Apply a transformer to an array of events, collecting all successes */
export function transformAll<TIn, TOut>(
  events: readonly TIn[],
  transformer: EventTransformer<TIn, TOut>,
): Result<readonly TOut[], CdcError> {
  const results: TOut[] = [];
  for (const event of events) {
    const r = transformer(event);
    if (!r.ok) return r;
    results.push(r.value);
  }
  return ok(results);
}

/** Filter events by table name */
export const filterByTable = (
  tables: readonly string[],
): EventTransformer<CdcEvent, CdcEvent> =>
  (event: CdcEvent): Result<CdcEvent, CdcError> => {
    if (tables.includes(event.table)) return ok(event);
    return err(cdcError("TRANSFORM_FAILED", `Table ${event.table} not in filter list`));
  };

/** Filter events by operation type */
export const filterByOperation = (
  operations: readonly CdcEvent["operation"][],
): EventTransformer<CdcEvent, CdcEvent> =>
  (event: CdcEvent): Result<CdcEvent, CdcError> => {
    if (operations.includes(event.operation)) return ok(event);
    return err(cdcError("TRANSFORM_FAILED", `Operation ${event.operation} not in filter list`));
  };

/** Extract only the 'after' record from an event */
export const extractAfter = (
  event: CdcEvent,
): Result<Readonly<Record<string, unknown>>, CdcError> => {
  if (event.after === null) {
    return err(cdcError("TRANSFORM_FAILED", `No 'after' state for ${event.operation} on ${event.table}`));
  }
  return ok(event.after);
};
