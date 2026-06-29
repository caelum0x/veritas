// types.ts: shared type aliases and common interfaces for the CDC module
import type { Result } from "@veritas/core";
import type { CdcEvent, CdcOperation, CdcEventId } from "./change-event.js";
import type { CdcError } from "./errors.js";

/** Re-export alias so consumer code may use either name */
export type { CdcEvent as ChangeEvent };

/** Discriminated union narrowing helper for CDC operation types */
export type InsertEvent = CdcEvent & { readonly operation: "insert"; readonly after: Readonly<Record<string, unknown>> };
export type UpdateEvent = CdcEvent & { readonly operation: "update"; readonly after: Readonly<Record<string, unknown>> };
export type DeleteEvent = CdcEvent & { readonly operation: "delete"; readonly before: Readonly<Record<string, unknown>> };
export type TruncateEvent = CdcEvent & { readonly operation: "truncate" };

/** Type guards for operation-specific narrowing */
export const isInsertEvent = (e: CdcEvent): e is InsertEvent => e.operation === "insert" && e.after !== null;
export const isUpdateEvent = (e: CdcEvent): e is UpdateEvent => e.operation === "update" && e.after !== null;
export const isDeleteEvent = (e: CdcEvent): e is DeleteEvent => e.operation === "delete" && e.before !== null;
export const isTruncateEvent = (e: CdcEvent): e is TruncateEvent => e.operation === "truncate";

/** Generic handler for a CDC event, returning a Result */
export type CdcEventHandlerFn<TOut = void> = (
  event: CdcEvent,
) => Promise<Result<TOut, CdcError>>;

/** A filter predicate over CDC events */
export type CdcFilter = (event: CdcEvent) => boolean;

/** Table-scoped filter factory */
export const tableFilter =
  (...tables: readonly string[]): CdcFilter =>
  (event: CdcEvent): boolean =>
    tables.includes(event.table);

/** Operation-scoped filter factory */
export const operationFilter =
  (...ops: readonly CdcOperation[]): CdcFilter =>
  (event: CdcEvent): boolean =>
    ops.includes(event.operation);

/** Compose multiple filters with AND semantics */
export const allFilters =
  (...filters: readonly CdcFilter[]): CdcFilter =>
  (event: CdcEvent): boolean =>
    filters.every((f) => f(event));

/** Compose multiple filters with OR semantics */
export const anyFilter =
  (...filters: readonly CdcFilter[]): CdcFilter =>
  (event: CdcEvent): boolean =>
    filters.some((f) => f(event));

/** Re-export branded id type for convenience */
export type { CdcEventId, CdcOperation };
