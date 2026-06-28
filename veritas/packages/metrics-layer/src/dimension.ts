// Metric dimension: a categorical or temporal attribute used to slice metric data.
import { z } from "zod";

export const DimensionTypeSchema = z.enum(["categorical", "temporal", "numeric", "boolean"]);
export type DimensionType = z.infer<typeof DimensionTypeSchema>;

export const DimensionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  type: DimensionTypeSchema,
  /** Source table that contains this dimension column */
  sourceTable: z.string().min(1),
  /** Column in the source table */
  sourceColumn: z.string().min(1),
  /** For temporal dimensions: the primary time column for grain truncation */
  isTemporal: z.boolean().default(false),
  /** Allowed values for categorical dimensions (empty = unconstrained) */
  allowedValues: z.array(z.string()).default([]),
  /** Join path from metric source table to this dimension's source table */
  joinPath: z
    .array(
      z.object({
        fromTable: z.string(),
        fromColumn: z.string(),
        toTable: z.string(),
        toColumn: z.string(),
      })
    )
    .default([]),
  tags: z.record(z.string()).default({}),
});

export type Dimension = z.infer<typeof DimensionSchema>;

export const CreateDimensionSchema = DimensionSchema;
export type CreateDimension = z.infer<typeof CreateDimensionSchema>;

/** A filter applied on a dimension when querying metrics */
export const DimensionFilterSchema = z.object({
  dimensionId: z.string().min(1),
  /** Comparison operator */
  op: z.enum(["eq", "neq", "in", "like", "gt", "gte", "lt", "lte"]),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
});
export type DimensionFilter = z.infer<typeof DimensionFilterSchema>;
