// Replication policy: defines cross-region data replication rules and evaluates compliance.
import { z } from "zod";
import { ok, err, type Result } from "@veritas/core";
import {
  ReplicationPolicySchema,
  DataResidencyZoneSchema,
} from "./types.js";
import type { ReplicationPolicy, DataResidencyZone, RegionId } from "./types.js";
import type { Region } from "./region.js";
import { ReplicationConflictError, ResidencyViolationError } from "./errors.js";

export type { ReplicationPolicy, DataResidencyZone };
export { ReplicationPolicySchema };

export const ReplicationTargetSchema = z.object({
  regionId: z.string().min(1),
  zone: DataResidencyZoneSchema,
  syncMode: z.enum(["sync", "async", "semi-sync"]),
  priority: z.number().int().min(0).default(0),
});
export type ReplicationTarget = z.infer<typeof ReplicationTargetSchema>;

export const ReplicationPlanSchema = z.object({
  sourceRegionId: z.string().min(1),
  targets: z.array(ReplicationTargetSchema).min(1),
  policy: ReplicationPolicySchema,
});
export type ReplicationPlan = z.infer<typeof ReplicationPlanSchema>;

/** Maps provider regions to residency zones (subset of common cloud regions). */
const REGION_ZONE_MAP: Readonly<Record<string, DataResidencyZone>> = {
  "us-east-1": "us",
  "us-west-2": "us",
  "eu-west-1": "eu",
  "eu-central-1": "eu",
  "ap-southeast-1": "ap",
  "ap-northeast-1": "ap",
  "ap-south-1": "ap",
  global: "global",
};

export function inferResidencyZone(region: Region): DataResidencyZone {
  const mapped = REGION_ZONE_MAP[region.name];
  if (mapped !== undefined) return mapped;
  if (region.name.startsWith("us-")) return "us";
  if (region.name.startsWith("eu-")) return "eu";
  if (region.name.startsWith("ap-")) return "ap";
  return "global";
}

export function buildReplicationPlan(
  sourceRegion: Region,
  allRegions: ReadonlyArray<Region>,
  policy: ReplicationPolicy,
): Result<ReplicationPlan, ResidencyViolationError> {
  const sourceZone = inferResidencyZone(sourceRegion);
  const allowedZones = new Set<DataResidencyZone>(policy.zones);

  if (!allowedZones.has(sourceZone) && !allowedZones.has("global")) {
    return err(new ResidencyViolationError("source-region", sourceRegion.id));
  }

  const eligibleRegions = allRegions.filter((r) => {
    if (r.id === sourceRegion.id) return false;
    const zone = inferResidencyZone(r);
    return allowedZones.has(zone) || allowedZones.has("global");
  });

  const targets: ReplicationTarget[] = eligibleRegions
    .slice(0, policy.maxReplicas)
    .map((r, idx) => ({
      regionId: r.id,
      zone: inferResidencyZone(r),
      syncMode: policy.syncMode,
      priority: idx,
    }));

  if (targets.length < policy.minReplicas - 1) {
    return err(new ResidencyViolationError("insufficient-replicas", sourceRegion.id));
  }

  return ok({
    sourceRegionId: sourceRegion.id,
    targets,
    policy,
  });
}

export interface ReplicationConflict {
  readonly resourceId: string;
  readonly regionAId: RegionId;
  readonly regionBId: RegionId;
  readonly vectorClock: Readonly<Record<string, number>>;
}

export function detectConflict(
  a: { resourceId: string; version: number; regionId: RegionId },
  b: { resourceId: string; version: number; regionId: RegionId },
): Result<void, ReplicationConflictError> {
  if (a.resourceId !== b.resourceId) return ok(undefined);
  if (a.version === b.version && a.regionId !== b.regionId) {
    return err(new ReplicationConflictError(a.resourceId));
  }
  return ok(undefined);
}
