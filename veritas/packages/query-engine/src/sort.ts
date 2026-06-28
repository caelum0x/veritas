// Sort and limit/offset operations over RowRecord arrays.
import type { RowRecord, QuerySort } from "@veritas/warehouse";

function compareCell(a: unknown, b: unknown): number {
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return String(a).localeCompare(String(b));
}

/** Stable multi-key sort. Returns a new array; does not mutate the input. */
export function applySort(
  rows: readonly RowRecord[],
  sorts: readonly QuerySort[],
): readonly RowRecord[] {
  if (sorts.length === 0) return rows;

  return [...rows].sort((a, b) => {
    for (const { column, direction } of sorts) {
      const aVal = (a as Record<string, unknown>)[column];
      const bVal = (b as Record<string, unknown>)[column];
      const cmp = compareCell(aVal, bVal);
      if (cmp !== 0) return direction === "asc" ? cmp : -cmp;
    }
    return 0;
  });
}

/** Apply offset and limit to a sorted row array. Returns a new slice. */
export function applyLimitOffset(
  rows: readonly RowRecord[],
  limit?: number,
  offset?: number,
): readonly RowRecord[] {
  const start = offset && offset > 0 ? offset : 0;
  const sliced = start > 0 ? rows.slice(start) : rows;
  if (limit !== undefined && limit >= 0) {
    return sliced.slice(0, limit);
  }
  return sliced;
}

/** Apply sort then limit/offset in a single pass. */
export function applySortAndLimit(
  rows: readonly RowRecord[],
  sorts: readonly QuerySort[],
  limit?: number,
  offset?: number,
): readonly RowRecord[] {
  return applyLimitOffset(applySort(rows, sorts), limit, offset);
}
