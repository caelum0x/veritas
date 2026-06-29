// ResultSet: immutable wrapper around query output rows with column metadata and iteration helpers.
import type { RowRecord } from "@veritas/warehouse";

/** Column descriptor inferred or declared for a result set. */
export interface ResultColumn {
  readonly name: string;
  readonly index: number;
}

/** Immutable result set produced by the query executor. */
export interface ResultSet {
  readonly columns: readonly ResultColumn[];
  readonly rows: readonly RowRecord[];
  readonly totalRows: number;
  readonly executionMs: number;
}

/** Build a ResultSet from raw rows and timing info. */
export function makeResultSet(
  rows: readonly RowRecord[],
  executionMs: number,
  totalRows?: number,
): ResultSet {
  const columns = deriveColumns(rows);
  return {
    columns,
    rows,
    totalRows: totalRows ?? rows.length,
    executionMs,
  };
}

/** Derive column descriptors from the first row of results. */
function deriveColumns(rows: readonly RowRecord[]): readonly ResultColumn[] {
  if (rows.length === 0) return [];
  return Object.keys(rows[0]!).map((name, index) => ({ name, index }));
}

/** Return a slice of the result set without mutating the original. */
export function sliceResultSet(rs: ResultSet, offset: number, limit: number): ResultSet {
  const sliced = rs.rows.slice(offset, offset + limit);
  return {
    columns: rs.columns,
    rows: sliced,
    totalRows: rs.totalRows,
    executionMs: rs.executionMs,
  };
}

/** Map each row through a transform, producing a new ResultSet. */
export function mapResultSet(
  rs: ResultSet,
  fn: (row: RowRecord) => RowRecord,
): ResultSet {
  const rows = rs.rows.map(fn);
  return makeResultSet(rows, rs.executionMs, rs.totalRows);
}

/** Filter rows without changing totalRows (useful for post-execution filtering). */
export function filterResultSet(
  rs: ResultSet,
  predicate: (row: RowRecord) => boolean,
): ResultSet {
  const rows = rs.rows.filter(predicate);
  return {
    columns: deriveColumns(rows.length > 0 ? rows : rs.rows),
    rows,
    totalRows: rows.length,
    executionMs: rs.executionMs,
  };
}

/** Extract a single column's values as an array. */
export function pluckColumn(rs: ResultSet, columnName: string): readonly unknown[] {
  return rs.rows.map((row) => row[columnName]);
}

/** Return an empty result set with zero execution time. */
export function emptyResultSet(): ResultSet {
  return { columns: [], rows: [], totalRows: 0, executionMs: 0 };
}
