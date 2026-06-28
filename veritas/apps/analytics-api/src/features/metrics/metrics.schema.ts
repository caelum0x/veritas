// Zod schemas for metrics HTTP request/response validation.
import { z } from "zod";

export const MetricsQuerySchema = z.object({
  orgId: z.string().min(1),
  from: z.string(),
  to: z.string(),
  granularity: z.enum(["hour", "day", "week", "month"]).default("day"),
  windowHours: z.coerce.number().int().min(1).max(8760).default(24),
});

export type MetricsQuery = z.infer<typeof MetricsQuerySchema>;

export const PlatformMetricsQuerySchema = z.object({
  from: z.string(),
  to: z.string(),
  granularity: z.enum(["hour", "day", "week", "month"]).default("day"),
  windowHours: z.coerce.number().int().min(1).max(8760).default(24),
});

export type PlatformMetricsQuery = z.infer<typeof PlatformMetricsQuerySchema>;

export const TrustTrendsQuerySchema = z.object({
  orgId: z.string().min(1),
  windowDays: z.coerce.number().int().min(1).max(365).default(30),
  bucketHours: z.coerce.number().int().min(1).max(168).default(6),
});

export type TrustTrendsQuery = z.infer<typeof TrustTrendsQuerySchema>;

export const AnalyticsReportQuerySchema = z.object({
  orgId: z.string().min(1),
  from: z.string(),
  to: z.string(),
  granularity: z.enum(["hour", "day", "week", "month"]).default("day"),
});

export type AnalyticsReportQuery = z.infer<typeof AnalyticsReportQuerySchema>;

export const EventsQuerySchema = z.object({
  orgId: z.string().optional(),
  userId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  eventNames: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export type EventsQuery = z.infer<typeof EventsQuerySchema>;

export const TrackEventBodySchema = z.object({
  type: z.string().min(1).max(100),
  organizationId: z.string().optional(),
  userId: z.string().optional(),
  properties: z.record(z.unknown()).default({}),
  occurredAt: z.string().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  success: z.boolean().optional(),
});

export type TrackEventBody = z.infer<typeof TrackEventBodySchema>;
