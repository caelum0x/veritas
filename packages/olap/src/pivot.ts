// Pivot — rotate dimensions between rows and columns to produce a cross-tabulation matrix.
import { z } from "zod";
import { ok, err, type Result } from "@veritas/core";
import { InvalidPivotError } from "./errors.js";
import type { DimensionCoord, CellValue, CoordKey } from "./types.js";
import { encodeCoord } from "./types.js";

export const PivotSpecSchema = z.object({
  /** Dimensions placed on rows. */
  rowDimensions: z.array(z.string().min(1)).min(1),
  /** Dimensions placed on columns. */
  colDimensions: z.array(z.string().min(1)).min(1),
  /** Which measure value to display in cells. */
  measureName: z.string().min(1),
});
export type PivotSpec = z.infer<typeof PivotSpecSchema>;

export interface PivotRow {
  readonly rowKey: CoordKey;
  readonly rowCoord: DimensionCoord;
  readonly cells: ReadonlyMap<CoordKey, CellValue | null>;
}

export interface PivotTable {
  readonly colHeaders: ReadonlyArray<{ key: CoordKey; coord: DimensionCoord }>;
  readonly rows: readonly PivotRow[];
  readonly measureName: string;
}

/** Project a full coordinate onto a subset of dimensions. */
function projectCoord(coord: DimensionCoord, dims: readonly string[]): DimensionCoord {
  return Object.fromEntries(dims.map((d) => [d, coord[d] ?? null]));
}

/**
 * Pivot a flat list of (coord, cell) entries into a 2D cross-tabulation.
 * Each entry must include all dimensions referenced in the spec.
 */
export function pivot(
  entries: readonly { coord: DimensionCoord; cell: CellValue }[],
  spec: PivotSpec
): Result<PivotTable, InvalidPivotError> {
  const parsed = PivotSpecSchema.safeParse(spec);
  if (!parsed.success) {
    return err(new InvalidPivotError(parsed.error.message));
  }

  const { rowDimensions, colDimensions, measureName } = parsed.data;

  const overlap = rowDimensions.filter((d) => colDimensions.includes(d));
  if (overlap.length > 0) {
    return err(new InvalidPivotError(`dimensions appear in both rows and cols: ${overlap.join(", ")}`));
  }

  // Collect unique row and column coordinates (preserve insertion order).
  const rowMap = new Map<CoordKey, DimensionCoord>();
  const colMap = new Map<CoordKey, DimensionCoord>();
  const dataMap = new Map<string, CellValue>();

  for (const { coord, cell } of entries) {
    const rowCoord = projectCoord(coord, rowDimensions);
    const colCoord = projectCoord(coord, colDimensions);
    const rk = encodeCoord(rowCoord);
    const ck = encodeCoord(colCoord);
    if (!rowMap.has(rk)) rowMap.set(rk, rowCoord);
    if (!colMap.has(ck)) colMap.set(ck, colCoord);
    dataMap.set(`${rk}||${ck}`, cell);
  }

  const colHeaders: Array<{ key: CoordKey; coord: DimensionCoord }> = [];
  for (const [key, coord] of colMap) {
    colHeaders.push({ key, coord });
  }

  const rows: PivotRow[] = [];
  for (const [rk, rowCoord] of rowMap) {
    const cells = new Map<CoordKey, CellValue | null>();
    for (const { key: ck } of colHeaders) {
      cells.set(ck, dataMap.get(`${rk}||${ck}`) ?? null);
    }
    rows.push({ rowKey: rk, rowCoord, cells });
  }

  return ok({ colHeaders, rows, measureName });
}

/** Transpose a PivotTable — swap rows and columns. */
export function transposePivot(table: PivotTable): PivotTable {
  const newColHeaders: Array<{ key: CoordKey; coord: DimensionCoord }> = table.rows.map((r) => ({
    key: r.rowKey,
    coord: r.rowCoord,
  }));

  const newRows: PivotRow[] = table.colHeaders.map(({ key: ck, coord: colCoord }) => {
    const cells = new Map<CoordKey, CellValue | null>();
    for (const row of table.rows) {
      cells.set(row.rowKey, row.cells.get(ck) ?? null);
    }
    return { rowKey: ck, rowCoord: colCoord, cells };
  });

  return { colHeaders: newColHeaders, rows: newRows, measureName: table.measureName };
}
