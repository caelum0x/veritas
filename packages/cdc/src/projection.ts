// Projects CDC event streams into materialized read-model state.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { CdcEvent, CdcOperation } from "./change-event.js";
import type { CdcError } from "./errors.js";
import { cdcError } from "./errors.js";

/** A read-model entry stored by primary key string */
export type ProjectionState<T> = Readonly<Record<string, T>>;

/** Handlers per operation that fold a CDC event into state */
export interface ProjectionHandlers<T> {
  insert?: (after: Readonly<Record<string, unknown>>, pk: string) => Result<T, CdcError>;
  update?: (
    before: Readonly<Record<string, unknown>>,
    after: Readonly<Record<string, unknown>>,
    pk: string,
    current: T | undefined,
  ) => Result<T, CdcError>;
  delete?: (pk: string, current: T | undefined) => Result<T | null, CdcError>;
  truncate?: () => Result<null, CdcError>;
}

/** Compute a stable string key from a CDC event's pk map */
export const pkKey = (pk: Readonly<Record<string, string | number>>): string =>
  Object.keys(pk)
    .sort()
    .map((k) => `${k}=${pk[k]}`)
    .join("&");

export interface Projection<T> {
  /** Apply a single event, returning the updated state */
  apply(event: CdcEvent, state: ProjectionState<T>): Result<ProjectionState<T>, CdcError>;
  /** Apply a sequence of events in order */
  applyAll(
    events: readonly CdcEvent[],
    initial: ProjectionState<T>,
  ): Result<ProjectionState<T>, CdcError>;
}

/** Create a projection from per-operation handlers */
export function createProjection<T>(
  table: string,
  handlers: ProjectionHandlers<T>,
): Projection<T> {
  const applyOne = (
    event: CdcEvent,
    state: ProjectionState<T>,
  ): Result<ProjectionState<T>, CdcError> => {
    if (event.table !== table) {
      return ok(state);
    }

    const pk = pkKey(event.pk);
    const op: CdcOperation = event.operation;

    if (op === "insert") {
      if (!handlers.insert || !event.after) return ok(state);
      const r = handlers.insert(event.after, pk);
      if (!r.ok) return r;
      return ok({ ...state, [pk]: r.value });
    }

    if (op === "update") {
      if (!handlers.update || !event.after) return ok(state);
      const before = event.before ?? {};
      const r = handlers.update(before, event.after, pk, state[pk]);
      if (!r.ok) return r;
      return ok({ ...state, [pk]: r.value });
    }

    if (op === "delete") {
      if (!handlers.delete) {
        const { [pk]: _removed, ...rest } = state as Record<string, T>;
        return ok(rest as ProjectionState<T>);
      }
      const r = handlers.delete(pk, state[pk]);
      if (!r.ok) return r;
      if (r.value === null) {
        const { [pk]: _removed, ...rest } = state as Record<string, T>;
        return ok(rest as ProjectionState<T>);
      }
      return ok({ ...state, [pk]: r.value });
    }

    if (op === "truncate") {
      if (handlers.truncate) {
        const r = handlers.truncate();
        if (!r.ok) return r;
      }
      return ok({} as ProjectionState<T>);
    }

    return err(cdcError("PROJECTION_FAILED", `Unknown operation: ${op as string}`));
  };

  return {
    apply: applyOne,
    applyAll(
      events: readonly CdcEvent[],
      initial: ProjectionState<T>,
    ): Result<ProjectionState<T>, CdcError> {
      let state = initial;
      for (const event of events) {
        const r = applyOne(event, state);
        if (!r.ok) return r;
        state = r.value;
      }
      return ok(state);
    },
  };
}
