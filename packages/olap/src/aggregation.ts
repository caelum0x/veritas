// Pre-aggregation engine — computes and caches rolled-up measure values for cube cells.
import { ok, err, type Result } from "@veritas/core";
import type { Cube } from "./cube.js";
import type { Measure } from "./measure.js";
import { aggregate } from "./measure.js";
import { AggregationError } from "./errors.js";
import { encodeCoord, type DimensionCoord, type ResultMatrix, type CellValue } from "./types.js";
import { formatMeasure } from "./measure.js";

/** A set of rows (from the warehouse) keyed by column name. */
export type FactRow = Readonly<Record<string, unknown>>;

/** Options for a pre-aggregation run. */
export interface AggregationOptions {
  /** Names of dimensions to group by. */
  readonly groupBy: readonly string[];
  /** Names of measures to compute. */
  readonly measureNames: readonly string[];
}

/** Output of a pre-aggregation run: one ResultMatrix per measure. */
export type AggregationResult = ReadonlyMap<string, ResultMatrix>;

/** Extract a numeric value from an unknown cell, returning null for non-numeric. */
function toNumber(value: unknown): number | null {
  if (typeof value === "number" && isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Extract dimension coordinate from a fact row for the given dimension columns. */
function extractCoord(row: FactRow, groupByColumns: readonly string[]): DimensionCoord {
  const entries = groupByColumns.map((col) => {
    const v = row[col];
    const safe = typeof v === "string" || typeof v === "number" ? v : String(v ?? "");
    return [col, safe] as const;
  });
  return Object.fromEntries(entries);
}

/**
 * Aggregate fact rows in-memory, grouping by the specified dimension columns
 * and computing each measure's aggregation function.
 */
export function computeAggregations(
  cube: Cube,
  rows: readonly FactRow[],
  options: AggregationOptions
): Result<AggregationResult> {
  const { groupBy, measureNames } = options;

  // Resolve measure descriptors
  const measures: Measure[] = [];
  for (const mName of measureNames) {
    const m = cube.measures.find((ms) => ms.name === mName);
    if (m === undefined) {
      return err(new AggregationError(`Unknown measure: ${mName}`));
    }
    measures.push(m);
  }

  // Resolve dimension FK columns for grouping
  const groupCols: string[] = [];
  for (const dimName of groupBy) {
    const dim = cube.dimensions.find((d) => d.name === dimName);
    if (dim === undefined) {
      return err(new AggregationError(`Unknown dimension: ${dimName}`));
    }
    groupCols.push(dim.foreignKey);
  }

  // Bucket rows by coordinate key
  const buckets = new Map<string, { coord: DimensionCoord; numericValues: Map<string, number[]> }>();

  for (const row of rows) {
    const coord = extractCoord(row, groupCols);
    const key = encodeCoord(coord);

    if (!buckets.has(key)) {
      const numericValues = new Map<string, number[]>(measures.map((m) => [m.name, []]));
      buckets.set(key, { coord, numericValues });
    }

    const bucket = buckets.get(key)!;
    for (const m of measures) {
      const raw = row[m.column];
      if (m.filterNulls && (raw === null || raw === undefined)) continue;
      const num = toNumber(raw);
      if (num !== null) {
        bucket.numericValues.get(m.name)!.push(num);
      }
    }
  }

  // Build one ResultMatrix per measure
  const resultByMeasure = new Map<string, ResultMatrix>();

  for (const m of measures) {
    const matrix = new Map<string, CellValue>();
    for (const [key, { numericValues }] of buckets) {
      const vals = numericValues.get(m.name) ?? [];
      const raw = aggregate(m.aggregation, vals);
      const cell: CellValue = { raw, formatted: formatMeasure(raw, m) };
      matrix.set(key, cell);
    }
    resultByMeasure.set(m.name, matrix as ResultMatrix);
  }

  return ok(resultByMeasure as AggregationResult);
}

/** Return sorted coordinate keys from a ResultMatrix. */
export function sortedKeys(matrix: ResultMatrix): readonly string[] {
  return Array.from(matrix.keys()).sort();
}
