// Shared type definitions for the timeseries module.
import { z } from "zod";

export const SeriesIdSchema = z.string().min(1).max(256);
export type SeriesId = z.infer<typeof SeriesIdSchema>;

export const ResolutionSchema = z.enum([
  "raw",
  "1m",
  "5m",
  "15m",
  "1h",
  "6h",
  "1d",
  "7d",
  "30d",
]);
export type Resolution = z.infer<typeof ResolutionSchema>;

export const AggFnSchema = z.enum(["sum", "avg", "min", "max", "count", "last", "first"]);
export type AggFn = z.infer<typeof AggFnSchema>;

export const QueryRangeSchema = z.object({
  seriesId: SeriesIdSchema,
  from: z.number().int().nonnegative(),
  to: z.number().int().nonnegative(),
  resolution: ResolutionSchema.optional().default("raw"),
  aggFn: AggFnSchema.optional().default("avg"),
  limit: z.number().int().positive().max(10_000).optional().default(10_000),
});
export type QueryRange = z.infer<typeof QueryRangeSchema>;

export const RetentionPolicySchema = z.object({
  resolution: ResolutionSchema,
  maxAgeMs: z.number().int().positive(),
});
export type RetentionPolicy = z.infer<typeof RetentionPolicySchema>;

export const SeriesMetaSchema = z.object({
  id: SeriesIdSchema,
  name: z.string().min(1).max(512),
  description: z.string().max(1024).optional(),
  labels: z.record(z.string()).optional(),
  retentionMs: z.number().int().positive().optional(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});
export type SeriesMeta = Readonly<z.infer<typeof SeriesMetaSchema>>;

export const DownsampleOptionsSchema = z.object({
  resolution: ResolutionSchema,
  aggFn: AggFnSchema.default("avg"),
});
export type DownsampleOptions = z.infer<typeof DownsampleOptionsSchema>;

export const RollupConfigSchema = z.object({
  sourceResolution: ResolutionSchema,
  targetResolution: ResolutionSchema,
  aggFn: AggFnSchema.default("avg"),
});
export type RollupConfig = z.infer<typeof RollupConfigSchema>;

export const InterpolationMethodSchema = z.enum(["linear", "step", "none"]);
export type InterpolationMethod = z.infer<typeof InterpolationMethodSchema>;

export const InterpolateOptionsSchema = z.object({
  method: InterpolationMethodSchema.default("linear"),
  maxGapMs: z.number().int().positive().optional(),
});
export type InterpolateOptions = z.infer<typeof InterpolateOptionsSchema>;

/** Resolution bucket size in milliseconds */
export const RESOLUTION_MS: Readonly<Record<Resolution, number>> = Object.freeze({
  raw: 0,
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "6h": 21_600_000,
  "1d": 86_400_000,
  "7d": 604_800_000,
  "30d": 2_592_000_000,
});
