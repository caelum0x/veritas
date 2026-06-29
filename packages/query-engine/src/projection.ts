// Projection: narrow a RowRecord to only the requested columns.
import type { RowRecord } from "@veritas/warehouse";

/** Project a row to include only the specified columns; returns a new object. */
export function projectRow(row: RowRecord, columns: readonly string[]): RowRecord {
  const out: Record<string, unknown> = {};
  for (const col of columns) {
    out[col] = row[col];
  }
  return out as RowRecord;
}

/**
 * Apply projection to an array of rows.
 * If columns is empty or undefined, rows are returned as-is.
 */
export function applyProjection(
  rows: readonly RowRecord[],
  columns: readonly string[] | undefined,
): readonly RowRecord[] {
  if (!columns || columns.length === 0) return rows;
  return rows.map((row) => projectRow(row, columns));
}

/** Derive the available column names from the first row of a result set. */
export function inferColumns(rows: readonly RowRecord[]): readonly string[] {
  if (rows.length === 0) return [];
  return Object.keys(rows[0]!);
}
