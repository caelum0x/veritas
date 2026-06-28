// DimensionTable — a table descriptor for slowly-changing reference/lookup data.
import { z } from "zod";
import { TableDescriptorSchema } from "./table.js";

export const SlowlyChangingTypeSchema = z.enum(["none", "scd1", "scd2"]);
export type SlowlyChangingType = z.infer<typeof SlowlyChangingTypeSchema>;

export const HierarchyLevelSchema = z.object({
  name: z.string().min(1),
  column: z.string().min(1),
  description: z.string().optional(),
});

export type HierarchyLevel = z.infer<typeof HierarchyLevelSchema>;

export const DimensionTableSchema = TableDescriptorSchema.extend({
  kind: z.literal("dimension"),
  /** Column whose value is surfaced as the human-readable label. */
  labelColumn: z.string().min(1),
  /** Optional hierarchy from coarsest to finest granularity. */
  hierarchy: z.array(HierarchyLevelSchema).default([]),
  /** Slowly-changing dimension strategy applied to this table. */
  scdType: SlowlyChangingTypeSchema.default("none"),
  /** Column tracking row validity start (SCD2 only). */
  validFromColumn: z.string().optional(),
  /** Column tracking row validity end (SCD2 only). */
  validToColumn: z.string().optional(),
});

export type DimensionTable = z.infer<typeof DimensionTableSchema>;

/** Create a validated DimensionTable descriptor. */
export function makeDimensionTable(input: unknown): DimensionTable {
  return DimensionTableSchema.parse(input);
}

/** Return the ordered hierarchy levels of a dimension table. */
export function getHierarchy(table: DimensionTable): readonly HierarchyLevel[] {
  return table.hierarchy;
}

/** Return true when this dimension uses SCD type-2 history. */
export function isScd2(table: DimensionTable): boolean {
  return table.scdType === "scd2";
}
