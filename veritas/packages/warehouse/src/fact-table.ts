// FactTable — a table descriptor specialised for measurable, event-level facts.
import { z } from "zod";
import { TableDescriptorSchema } from "./table.js";
import { ColumnSchema } from "./column.js";
import { AggregationSchema } from "./types.js";

export const MeasureSchema = z.object({
  column: z.string().min(1),
  aggregation: AggregationSchema,
  description: z.string().optional(),
});

export type Measure = z.infer<typeof MeasureSchema>;

export const FactTableSchema = TableDescriptorSchema.extend({
  kind: z.literal("fact"),
  measures: z.array(MeasureSchema).min(1),
  /** Foreign-key columns that join to dimension tables. */
  dimensionKeys: z.array(z.string()).default([]),
  /** Timestamp column used for time-based partitioning. */
  timeColumn: z.string().optional(),
});

export type FactTable = z.infer<typeof FactTableSchema>;

/** Create a validated FactTable descriptor. */
export function makeFactTable(input: unknown): FactTable {
  return FactTableSchema.parse(input);
}

/** Return all measure definitions for a fact table. */
export function getMeasures(table: FactTable): readonly Measure[] {
  return table.measures;
}

/** Return the names of all dimension foreign-key columns. */
export function getDimensionKeys(table: FactTable): readonly string[] {
  return table.dimensionKeys;
}

/** Return the column definitions for declared dimension keys. */
export function getDimensionKeyColumns(
  table: FactTable
): z.infer<typeof ColumnSchema>[] {
  return table.columns.filter((c) => table.dimensionKeys.includes(c.name));
}
