// Rollup — aggregate data by removing dimension granularity (GROUP BY subtotals).
import { z } from "zod";
import { ok, err, type Result } from "@veritas/core";
import { InvalidRollupError } from "./errors.js";
import { aggregate, type Measure } from "./measure.js";
import type { DimensionCoord, CellValue } from "./types.js";
import { encodeCoord } from "./types.js";

export const RollupSpecSchema = z.object({
  /** Dimensions to keep in the result (others are collapsed/totalled). */
  keepDimensions: z.array(z.string().min(1)),
  /** The measure to re-aggregate during rollup. */
  measureName: z.string().min(1),
});
export type RollupSpec = z.infer<typeof RollupSpecSchema>;

export interface RollupEntry {
  readonly coord: DimensionCoord;
  readonly cell: CellValue;
}

/** Group raw numeric values keyed by a projected coordinate. */
function groupValues(
  entries: readonly { coord: DimensionCoord; rawValue: number | null }[],
  keepDimensions: readonly string[]
): Map<string, { coord: DimensionCoord; values: number[] }> {
  const groups = new Map<string, { coord: DimensionCoord; values: number[] }>();

  for (const { coord, rawValue } of entries) {
    const projected: DimensionCoord = Object.fromEntries(
      keepDimensions.map((d) => [d, coord[d] ?? null])
    );
    const key = encodeCoord(projected);

    if (!groups.has(key)) {
      groups.set(key, { coord: projected, values: [] });
    }
    if (rawValue !== null) {
      groups.get(key)!.values.push(rawValue);
    }
  }

  return groups;
}

/**
 * Roll up a set of fact entries by collapsing dimensions not in keepDimensions.
 * Re-applies the measure's aggregation function to grouped values.
 */
export function rollup(
  entries: readonly { coord: DimensionCoord; rawValue: number | null }[],
  measure: Measure,
  spec: RollupSpec,
  formatter: (value: number | null, measure: Measure) => string
): Result<readonly RollupEntry[], InvalidRollupError> {
  const parsed = RollupSpecSchema.safeParse(spec);
  if (!parsed.success) {
    return err(new InvalidRollupError(parsed.error.message));
  }

  if (entries.length === 0) {
    return ok([]);
  }

  const { keepDimensions, measureName } = parsed.data;
  if (measureName !== measure.name) {
    return err(
      new InvalidRollupError(
        `spec measureName "${measureName}" does not match measure "${measure.name}"`
      )
    );
  }

  const groups = groupValues(entries, keepDimensions);
  const result: RollupEntry[] = [];

  for (const { coord, values } of groups.values()) {
    const raw = aggregate(measure.aggregation, values);
    const formatted = formatter(raw, measure);
    result.push({ coord, cell: { raw, formatted } });
  }

  return ok(result);
}

/**
 * Compute grand totals — rollup with zero kept dimensions.
 * Returns a single RollupEntry with an empty coordinate.
 */
export function grandTotal(
  entries: readonly { coord: DimensionCoord; rawValue: number | null }[],
  measure: Measure,
  formatter: (value: number | null, measure: Measure) => string
): Result<RollupEntry, InvalidRollupError> {
  const result = rollup(entries, measure, { keepDimensions: [], measureName: measure.name }, formatter);
  if (!result.ok) return result;
  const rows = result.value;
  const raw = rows[0]?.cell.raw ?? null;
  const formatted = rows[0]?.cell.formatted ?? formatter(null, measure);
  return ok({ coord: {}, cell: { raw, formatted } });
}
