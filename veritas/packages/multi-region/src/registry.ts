// Region registry — manages the canonical set of known regions and their current health state.

import { type Result, ok, err } from "@veritas/core";
import { type Region, type RegionId, type RegionStatus, type RegionCapability } from "./region.js";
import { type HealthCheckResult } from "./types.js";
import { RegionNotFoundError } from "./errors.js";

/** Port interface for persisting and querying the region catalog. */
export interface RegionRegistryPort {
  register(region: Region): Promise<void>;
  deregister(regionId: RegionId): Promise<void>;
  get(regionId: RegionId): Promise<Result<Region, RegionNotFoundError>>;
  list(filter?: RegionFilter): Promise<readonly Region[]>;
  updateStatus(regionId: RegionId, status: RegionStatus): Promise<Result<Region, RegionNotFoundError>>;
  applyHealthCheck(result: HealthCheckResult): Promise<Result<Region, RegionNotFoundError>>;
}

/** Optional filter for listing regions. */
export interface RegionFilter {
  readonly tier?: Region["tier"];
  readonly status?: RegionStatus;
  readonly capability?: RegionCapability;
  readonly provider?: Region["provider"];
}

function matchesFilter(region: Region, filter: RegionFilter): boolean {
  if (filter.tier !== undefined && region.tier !== filter.tier) return false;
  if (filter.status !== undefined && region.status !== filter.status) return false;
  if (filter.capability !== undefined && !region.capabilities.includes(filter.capability)) return false;
  if (filter.provider !== undefined && region.provider !== filter.provider) return false;
  return true;
}

/** Maps a HealthCheckResult status to a RegionStatus. */
function toRegionStatus(checkStatus: HealthCheckResult["status"]): RegionStatus {
  switch (checkStatus) {
    case "healthy": return "active";
    case "degraded": return "degraded";
    case "offline": return "offline";
  }
}

/** In-memory implementation of RegionRegistryPort — suitable for tests and local development. */
export class InMemoryRegionRegistry implements RegionRegistryPort {
  private readonly regions = new Map<string, Region>();

  async register(region: Region): Promise<void> {
    this.regions.set(region.id, region);
  }

  async deregister(regionId: RegionId): Promise<void> {
    this.regions.delete(regionId);
  }

  async get(regionId: RegionId): Promise<Result<Region, RegionNotFoundError>> {
    const region = this.regions.get(regionId);
    if (!region) return err(new RegionNotFoundError(regionId));
    return ok(region);
  }

  async list(filter?: RegionFilter): Promise<readonly Region[]> {
    const all = Array.from(this.regions.values());
    if (!filter) return all;
    return all.filter((r) => matchesFilter(r, filter));
  }

  async updateStatus(
    regionId: RegionId,
    status: RegionStatus
  ): Promise<Result<Region, RegionNotFoundError>> {
    const existing = this.regions.get(regionId);
    if (!existing) return err(new RegionNotFoundError(regionId));
    const updated: Region = { ...existing, status, updatedAt: new Date().toISOString() };
    this.regions.set(regionId, updated);
    return ok(updated);
  }

  async applyHealthCheck(
    result: HealthCheckResult
  ): Promise<Result<Region, RegionNotFoundError>> {
    return this.updateStatus(result.regionId, toRegionStatus(result.status));
  }
}
