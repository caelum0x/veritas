// Region descriptor: defines a deployable geographic zone with health and capability metadata.
import { z } from "zod";
import {
  RegionIdSchema,
  RegionTierSchema,
  RegionStatusSchema,
  GeoCoordinatesSchema,
} from "./types.js";
import type { RegionId, RegionTier, RegionStatus, GeoCoordinates } from "./types.js";

export type { RegionId, RegionTier, RegionStatus, GeoCoordinates };

export const RegionCapabilitySchema = z.enum([
  "read",
  "write",
  "search",
  "analytics",
  "ai-inference",
  "media-processing",
]);
export type RegionCapability = z.infer<typeof RegionCapabilitySchema>;

export const RegionSchema = z.object({
  id: RegionIdSchema,
  name: z.string().min(1),
  displayName: z.string().min(1),
  tier: RegionTierSchema,
  status: RegionStatusSchema,
  capabilities: z.array(RegionCapabilitySchema),
  coordinates: GeoCoordinatesSchema,
  provider: z.enum(["aws", "gcp", "azure", "on-prem", "mock"]),
  availabilityZones: z.array(z.string()).min(1),
  endpoints: z.object({
    api: z.string().url(),
    internal: z.string().url(),
    metrics: z.string().url().optional(),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Region = z.infer<typeof RegionSchema>;

export const CreateRegionSchema = RegionSchema.omit({ createdAt: true, updatedAt: true });
export type CreateRegion = z.infer<typeof CreateRegionSchema>;

export function hasCapability(region: Region, capability: RegionCapability): boolean {
  return region.capabilities.includes(capability);
}

export function isRegionHealthy(region: Region): boolean {
  return region.status === "healthy";
}

export function isRegionWritable(region: Region): boolean {
  return isRegionHealthy(region) && hasCapability(region, "write");
}

export function regionDistance(a: Region, b: Region): number {
  const R = 6371;
  const dLat = toRad(b.coordinates.lat - a.coordinates.lat);
  const dLon = toRad(b.coordinates.lon - a.coordinates.lon);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const c =
    2 *
    Math.asin(
      Math.sqrt(
        sinLat * sinLat +
          Math.cos(toRad(a.coordinates.lat)) *
            Math.cos(toRad(b.coordinates.lat)) *
            sinLon *
            sinLon,
      ),
    );
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
