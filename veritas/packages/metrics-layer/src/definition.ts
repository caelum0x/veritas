// Metric definition: binds a metric to its allowed dimensions and time grains.
import { z } from "zod";
import { TimeGrainSchema } from "./time-grain.js";

export const MetricDefinitionSchema = z.object({
  id: z.string().min(1),
  metricId: z.string().min(1),
  /** Ordered list of dimension ids that can be used to slice this metric */
  dimensionIds: z.array(z.string()).default([]),
  /** Supported time grains for this definition */
  supportedGrains: z.array(TimeGrainSchema).default(["day"]),
  /** Default grain when none specified */
  defaultGrain: TimeGrainSchema.default("day"),
  /** Whether this metric can be filtered by arbitrary dimensions at query time */
  allowAdHocFilters: z.boolean().default(true),
  /** Maximum number of dimension breakdowns allowed per query */
  maxDimensions: z.number().int().min(1).max(10).default(3),
  /** Freshness SLA in seconds for cached results */
  cacheTtlSeconds: z.number().int().min(0).default(300),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type MetricDefinition = z.infer<typeof MetricDefinitionSchema>;

export const CreateMetricDefinitionSchema = MetricDefinitionSchema.omit({
  createdAt: true,
  updatedAt: true,
});
export type CreateMetricDefinition = z.infer<typeof CreateMetricDefinitionSchema>;

/** Resolve which dimensions are valid for a query given a definition */
export function resolveValidDimensions(
  definition: MetricDefinition,
  requestedDimensionIds: readonly string[]
): readonly string[] {
  if (definition.allowAdHocFilters) return requestedDimensionIds;
  return requestedDimensionIds.filter((id) => definition.dimensionIds.includes(id));
}
