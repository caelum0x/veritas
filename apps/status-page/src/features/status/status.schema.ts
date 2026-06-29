// Zod schemas for status feature request/response validation.
import { z } from "zod";

export const ComponentStatusSchema = z.enum([
  "operational",
  "degraded_performance",
  "partial_outage",
  "major_outage",
  "under_maintenance",
]);

export const UptimeResultSchema = z.object({
  componentId: z.string(),
  windowLabel: z.string(),
  uptimePercent: z.number().min(0).max(100),
  totalSamples: z.number().int().nonnegative(),
  healthySamples: z.number().int().nonnegative(),
});

export const ComponentStatusEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  group: z.string(),
  status: ComponentStatusSchema,
  description: z.string(),
  uptime: z.array(UptimeResultSchema),
});

export const SloSummarySchema = z.object({
  sloId: z.string(),
  sloName: z.string(),
  targetRatio: z.number().min(0).max(1),
  currentRatio: z.number().min(0).max(1),
  errorBudgetRemaining: z.number().min(0).max(1),
  withinTarget: z.boolean(),
  evaluatedAt: z.string(),
});

export const StatusPageResponseSchema = z.object({
  pageStatus: ComponentStatusSchema,
  components: z.array(ComponentStatusEntrySchema),
  activeIncidents: z.array(z.unknown()),
  recentIncidents: z.array(z.unknown()),
  sloSummaries: z.array(SloSummarySchema),
  generatedAt: z.string(),
  version: z.string(),
});

export const HealthCheckResultSchema = z.object({
  name: z.string(),
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  latencyMs: z.number(),
  checkedAt: z.string(),
  error: z.string().optional(),
  metadata: z.record(z.unknown()),
});

export const HealthSnapshotResponseSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  checks: z.array(HealthCheckResultSchema),
  timestamp: z.string(),
  version: z.string().optional(),
});

export const SloListResponseSchema = z.object({
  items: z.array(SloSummarySchema),
  total: z.number().int().nonnegative(),
});
