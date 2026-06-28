// Supplemental shared types for multi-region — region identifiers, tiers, statuses, latency measurements, health checks, and replication policy.

import { z } from "zod";

export const RegionIdSchema = z.string().min(1).brand<"RegionId">();
export type RegionId = z.infer<typeof RegionIdSchema>;

export const RegionTierSchema = z.enum(["primary", "secondary", "edge"]);
export type RegionTier = z.infer<typeof RegionTierSchema>;

export const RegionStatusSchema = z.enum(["active", "healthy", "degraded", "offline", "maintenance"]);
export type RegionStatus = z.infer<typeof RegionStatusSchema>;

export const GeoCoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});
export type GeoCoordinates = z.infer<typeof GeoCoordinatesSchema>;

export const LatencyMeasurementSchema = z.object({
  regionId: RegionIdSchema,
  latencyMs: z.number().nonnegative(),
  measuredAt: z.string().datetime(),
  sampleCount: z.number().int().positive().default(1),
});
export type LatencyMeasurement = z.infer<typeof LatencyMeasurementSchema>;

export const HealthCheckResultSchema = z.object({
  regionId: RegionIdSchema,
  status: z.enum(["healthy", "degraded", "offline"]),
  latencyMs: z.number().nonnegative().optional(),
  checkedAt: z.string().datetime(),
  message: z.string().optional(),
});
export type HealthCheckResult = z.infer<typeof HealthCheckResultSchema>;

export const DataResidencyZoneSchema = z.enum(["us", "eu", "ap", "global"]);
export type DataResidencyZone = z.infer<typeof DataResidencyZoneSchema>;

export const ReplicationPolicySchema = z.object({
  minReplicas: z.number().int().min(1).default(1),
  maxReplicas: z.number().int().min(1).default(3),
  zones: z.array(DataResidencyZoneSchema).min(1),
  syncMode: z.enum(["sync", "async", "semi-sync"]).default("async"),
});
export type ReplicationPolicy = z.infer<typeof ReplicationPolicySchema>;
