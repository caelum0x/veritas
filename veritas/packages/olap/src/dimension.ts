// Cube dimension definitions — categorical axes used to slice and group measures.
import { z } from "zod";
import { GranularitySchema } from "./types.js";

export const DimensionAttributeSchema = z.object({
  /** Column name in the underlying table. */
  column: z.string().min(1),
  /** Human-readable label. */
  label: z.string().min(1),
  /** Whether this attribute can be used as a filter. */
  filterable: z.boolean().default(true),
  /** Whether this attribute can be displayed in result sets. */
  visible: z.boolean().default(true),
});
export type DimensionAttribute = z.infer<typeof DimensionAttributeSchema>;

export const HierarchyLevelSchema = z.object({
  name: z.string().min(1),
  attribute: DimensionAttributeSchema,
});
export type HierarchyLevel = z.infer<typeof HierarchyLevelSchema>;

export const DimensionTypeSchema = z.enum(["regular", "time", "degenerate"]);
export type DimensionType = z.infer<typeof DimensionTypeSchema>;

export const CubeDimensionSchema = z.object({
  /** Unique name within the cube. */
  name: z.string().min(1),
  /** Source table reference (schema.table). */
  tableRef: z.string().min(1),
  /** Foreign key column in the fact table linking to this dimension. */
  foreignKey: z.string().min(1),
  /** Primary key column in the dimension table. */
  primaryKey: z.string().min(1),
  /** Dimension type — regular, time, or degenerate (no join). */
  type: DimensionTypeSchema.default("regular"),
  /** Ordered hierarchy levels from coarsest to finest. */
  hierarchy: z.array(HierarchyLevelSchema).default([]),
  /** Flat attributes available for filtering / display. */
  attributes: z.array(DimensionAttributeSchema).default([]),
  /** For time dimensions: supported granularities. */
  granularities: z.array(GranularitySchema).optional(),
});
export type CubeDimension = z.infer<typeof CubeDimensionSchema>;

/** Validate and create a CubeDimension. */
export function makeDimension(input: unknown): CubeDimension {
  return CubeDimensionSchema.parse(input);
}

/** Return the finest granularity level in a time dimension hierarchy. */
export function finestLevel(dim: CubeDimension): HierarchyLevel | undefined {
  return dim.hierarchy.at(-1);
}

/** Return the coarsest granularity level in a time dimension hierarchy. */
export function coarsestLevel(dim: CubeDimension): HierarchyLevel | undefined {
  return dim.hierarchy.at(0);
}

/** Return the index of a named hierarchy level, or -1 if not found. */
export function levelIndex(dim: CubeDimension, levelName: string): number {
  return dim.hierarchy.findIndex((l) => l.name === levelName);
}
