// StarSchema — groups a single fact table with its related dimension tables.
import { z } from "zod";
import { FactTableSchema, type FactTable } from "./fact-table.js";
import { DimensionTableSchema, type DimensionTable } from "./dimension.js";

export const StarSchemaSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  fact: FactTableSchema,
  dimensions: z.array(DimensionTableSchema).default([]),
});

export type StarSchema = z.infer<typeof StarSchemaSchema>;

/** Create a validated StarSchema. */
export function makeStarSchema(input: unknown): StarSchema {
  return StarSchemaSchema.parse(input);
}

/** Find a dimension by name within a star schema. */
export function findDimension(
  schema: StarSchema,
  name: string
): DimensionTable | undefined {
  return schema.dimensions.find((d) => d.name === name);
}

/** Return all table names referenced by the star schema (fact + dimensions). */
export function allTableNames(schema: StarSchema): readonly string[] {
  return [schema.fact.name, ...schema.dimensions.map((d) => d.name)];
}

/** Return all tables (fact + dimensions) as a flat array. */
export function allTables(
  schema: StarSchema
): readonly (FactTable | DimensionTable)[] {
  return [schema.fact, ...schema.dimensions];
}

/** Return dimension tables that satisfy the given fact table's dimension keys. */
export function resolvedDimensions(schema: StarSchema): readonly DimensionTable[] {
  const keys = new Set(schema.fact.dimensionKeys);
  return schema.dimensions.filter((d) =>
    d.columns.some((c) => c.primaryKey && keys.has(c.name))
  );
}
