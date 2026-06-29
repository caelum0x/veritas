// Slice and dice operations — filter a cube result set along one or more dimension axes.
import { z } from "zod";
import { ok, err, type Result } from "@veritas/core";
import { InvalidSliceError } from "./errors.js";
import type { DimensionCoord, ResultMatrix, CoordKey, CellValue } from "./types.js";
import { encodeCoord } from "./types.js";

/** A single slice predicate: fix one dimension to a specific set of member values. */
export const SlicePredicateSchema = z.object({
  dimension: z.string().min(1),
  members: z.array(z.union([z.string(), z.number(), z.null()])).min(1),
});
export type SlicePredicate = z.infer<typeof SlicePredicateSchema>;

/** A complete slice specification — one or more predicates ANDed together. */
export const SliceSpecSchema = z.object({
  predicates: z.array(SlicePredicateSchema).min(1),
});
export type SliceSpec = z.infer<typeof SliceSpecSchema>;

/** Whether a coordinate satisfies a single predicate. */
function matchesPredicate(coord: DimensionCoord, pred: SlicePredicate): boolean {
  const val = coord[pred.dimension];
  return (pred.members as Array<string | number | null>).some((m) => m === val);
}

/** Whether a coordinate satisfies all predicates in a spec. */
function matchesSpec(coord: DimensionCoord, spec: SliceSpec): boolean {
  return spec.predicates.every((p) => matchesPredicate(coord, p));
}

/** Apply a slice spec to a result matrix, returning only matching entries. */
export function applySlice(
  matrix: ResultMatrix,
  coords: ReadonlyMap<CoordKey, DimensionCoord>,
  spec: SliceSpec
): Result<ResultMatrix, InvalidSliceError> {
  const parsed = SliceSpecSchema.safeParse(spec);
  if (!parsed.success) {
    return err(new InvalidSliceError(parsed.error.message));
  }

  const result = new Map<CoordKey, CellValue>();
  for (const [key, cell] of matrix) {
    const coord = coords.get(key);
    if (coord !== undefined && matchesSpec(coord, parsed.data)) {
      result.set(key, cell);
    }
  }
  return ok(result as ResultMatrix);
}

/** Dice: apply multiple independent slice specs (OR between specs, AND within each). */
export function applyDice(
  matrix: ResultMatrix,
  coords: ReadonlyMap<CoordKey, DimensionCoord>,
  specs: readonly SliceSpec[]
): Result<ResultMatrix, InvalidSliceError> {
  if (specs.length === 0) {
    return err(new InvalidSliceError("at least one slice spec is required for dice"));
  }

  const result = new Map<CoordKey, CellValue>();
  for (const [key, cell] of matrix) {
    const coord = coords.get(key);
    if (coord !== undefined && specs.some((s) => matchesSpec(coord, s))) {
      result.set(key, cell);
    }
  }
  return ok(result as ResultMatrix);
}

/** Build a coord map from an array of (coord, key) pairs for convenience. */
export function buildCoordMap(
  entries: readonly { coord: DimensionCoord; key?: CoordKey }[]
): ReadonlyMap<CoordKey, DimensionCoord> {
  const map = new Map<CoordKey, DimensionCoord>();
  for (const e of entries) {
    const key = e.key ?? encodeCoord(e.coord);
    map.set(key, e.coord);
  }
  return map;
}
