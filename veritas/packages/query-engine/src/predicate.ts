// Predicate evaluation: test a RowRecord against a QueryFilter condition.
import type { RowRecord, QueryFilter } from "@veritas/warehouse";

function compareValues(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "string" && typeof b === "string") return a.localeCompare(b);
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  const sa = String(a);
  const sb = String(b);
  return sa.localeCompare(sb);
}

function matchesFilter(row: RowRecord, filter: QueryFilter): boolean {
  const cell = row[filter.column];
  switch (filter.op) {
    case "eq":
      return cell === filter.value;
    case "neq":
      return cell !== filter.value;
    case "gt":
      return compareValues(cell, filter.value) > 0;
    case "gte":
      return compareValues(cell, filter.value) >= 0;
    case "lt":
      return compareValues(cell, filter.value) < 0;
    case "lte":
      return compareValues(cell, filter.value) <= 0;
    case "in": {
      if (!Array.isArray(filter.value)) return false;
      return (filter.value as unknown[]).includes(cell);
    }
    case "like": {
      if (typeof cell !== "string" || typeof filter.value !== "string") return false;
      const pattern = filter.value
        .replace(/[.*+?^${}()|[\]\\]/g, (ch) => (ch === "%" ? ".*" : ch === "_" ? "." : `\\${ch}`));
      return new RegExp(`^${pattern}$`, "i").test(cell);
    }
    default:
      return false;
  }
}

/** Returns true if the row satisfies all provided filters (AND semantics). */
export function evaluatePredicates(row: RowRecord, filters: readonly QueryFilter[]): boolean {
  return filters.every((f) => matchesFilter(row, f));
}

/** Curried predicate builder for use in Array.filter. */
export function buildPredicate(
  filters: readonly QueryFilter[],
): (row: RowRecord) => boolean {
  if (filters.length === 0) return () => true;
  return (row) => evaluatePredicates(row, filters);
}
