// OLAP cube descriptor — ties together a fact table, dimensions, and measures.
import { z } from "zod";
import { ok, err, type Result } from "@veritas/core";
import { CubeDimensionSchema, type CubeDimension } from "./dimension.js";
import { MeasureSchema, type Measure } from "./measure.js";
import { CubeNotFoundError, DimensionNotFoundError, MeasureNotFoundError } from "./errors.js";

export const CubeSchema = z.object({
  /** Unique identifier for this cube. */
  name: z.string().min(1),
  /** Human-readable label. */
  label: z.string().min(1),
  /** Qualified fact table reference (schema.table). */
  factTable: z.string().min(1),
  /** Dimensions available on this cube. */
  dimensions: z.array(CubeDimensionSchema).min(1),
  /** Measures available on this cube. */
  measures: z.array(MeasureSchema).min(1),
  /** Optional description. */
  description: z.string().optional(),
  /** Tags for catalogue filtering. */
  tags: z.record(z.string()).optional(),
});

export type Cube = z.infer<typeof CubeSchema>;

/** Validate and create a Cube descriptor. */
export function makeCube(input: unknown): Cube {
  return CubeSchema.parse(input);
}

/** In-memory registry of cubes — the port interface for cube storage. */
export interface CubeRegistry {
  register(cube: Cube): Result<void>;
  get(name: string): Result<Cube>;
  list(): readonly Cube[];
  remove(name: string): Result<void>;
}

/** Create an in-memory CubeRegistry. */
export function inMemoryCubeRegistry(): CubeRegistry {
  const store = new Map<string, Cube>();

  return {
    register(cube: Cube): Result<void> {
      store.set(cube.name, cube);
      return ok(undefined);
    },

    get(name: string): Result<Cube> {
      const cube = store.get(name);
      if (cube === undefined) return err(new CubeNotFoundError(name));
      return ok(cube);
    },

    list(): readonly Cube[] {
      return Array.from(store.values());
    },

    remove(name: string): Result<void> {
      if (!store.has(name)) return err(new CubeNotFoundError(name));
      store.delete(name);
      return ok(undefined);
    },
  };
}

/** Look up a dimension by name on a cube. */
export function getDimension(cube: Cube, name: string): Result<CubeDimension> {
  const dim = cube.dimensions.find((d) => d.name === name);
  if (dim === undefined) return err(new DimensionNotFoundError(name));
  return ok(dim);
}

/** Look up a measure by name on a cube. */
export function getMeasure(cube: Cube, name: string): Result<Measure> {
  const m = cube.measures.find((ms) => ms.name === name);
  if (m === undefined) return err(new MeasureNotFoundError(name));
  return ok(m);
}
