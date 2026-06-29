// Aggregation functions: group-by + sum/count/avg/min/max/count_distinct over RowRecord sets.
import type { RowRecord, Aggregation } from "@veritas/warehouse";

export interface AggregateSpec {
  readonly column: string;
  readonly func: Aggregation;
  readonly alias: string;
}

function groupRows(
  rows: readonly RowRecord[],
  groupByColumns: readonly string[],
): Map<string, readonly RowRecord[]> {
  const map = new Map<string, RowRecord[]>();
  for (const row of rows) {
    const key = groupByColumns
      .map((col) => String((row as Record<string, unknown>)[col] ?? ""))
      .join("\x00");
    const bucket = map.get(key) ?? [];
    bucket.push(row);
    map.set(key, bucket);
  }
  return map;
}

function numericValues(rows: readonly RowRecord[], column: string): number[] {
  return rows
    .map((r) => (r as Record<string, unknown>)[column])
    .filter((v): v is number => typeof v === "number");
}

function computeAgg(rows: readonly RowRecord[], spec: AggregateSpec): unknown {
  const { column, func } = spec;
  switch (func) {
    case "count":
      return rows.length;
    case "count_distinct": {
      const distinct = new Set(rows.map((r) => (r as Record<string, unknown>)[column]));
      return distinct.size;
    }
    case "sum": {
      const vals = numericValues(rows, column);
      return vals.reduce((acc, v) => acc + v, 0);
    }
    case "avg": {
      const vals = numericValues(rows, column);
      if (vals.length === 0) return null;
      return vals.reduce((acc, v) => acc + v, 0) / vals.length;
    }
    case "min": {
      const vals = numericValues(rows, column);
      if (vals.length === 0) return null;
      return Math.min(...vals);
    }
    case "max": {
      const vals = numericValues(rows, column);
      if (vals.length === 0) return null;
      return Math.max(...vals);
    }
    default:
      return null;
  }
}

/**
 * Apply group-by aggregation to rows.
 * If groupByColumns is empty, aggregates the entire set as one group.
 */
export function applyAggregation(
  rows: readonly RowRecord[],
  groupByColumns: readonly string[],
  aggregates: readonly AggregateSpec[],
): readonly RowRecord[] {
  if (aggregates.length === 0) return rows;

  const groups =
    groupByColumns.length > 0
      ? groupRows(rows, groupByColumns)
      : new Map([["__all__", rows as RowRecord[]]]);

  const results: RowRecord[] = [];

  for (const groupRows of groups.values()) {
    const base: Record<string, unknown> = {};

    // Carry over group-by column values from the first row of the group.
    if (groupRows.length > 0 && groupByColumns.length > 0) {
      for (const col of groupByColumns) {
        base[col] = (groupRows[0]! as Record<string, unknown>)[col];
      }
    }

    for (const spec of aggregates) {
      base[spec.alias] = computeAgg(groupRows, spec);
    }

    results.push(base as RowRecord);
  }

  return results;
}
