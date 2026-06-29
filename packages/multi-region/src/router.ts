// Region router: selects the best target region for a request based on strategy and health.
import { ok, err, type Result } from "@veritas/core";
import type { Region, RegionCapability } from "./region.js";
import { isRegionHealthy, hasCapability, regionDistance } from "./region.js";
import type { RegionId, GeoCoordinates } from "./types.js";
import { NoHealthyRegionError } from "./errors.js";

export type RoutingStrategy = "nearest" | "primary" | "round-robin" | "latency-weighted";

export interface RouterOptions {
  readonly strategy: RoutingStrategy;
  readonly preferredRegionId?: RegionId;
  readonly requiredCapability?: RegionCapability;
  readonly originCoordinates?: GeoCoordinates;
}

export interface RouteResult {
  readonly regionId: RegionId;
  readonly region: Region;
  readonly strategy: RoutingStrategy;
  readonly distanceKm?: number;
}

let roundRobinIndex = 0;

export function routeRequest(
  regions: ReadonlyArray<Region>,
  options: RouterOptions,
): Result<RouteResult, NoHealthyRegionError> {
  const candidates = regions.filter(
    (r) =>
      isRegionHealthy(r) &&
      (options.requiredCapability === undefined ||
        hasCapability(r, options.requiredCapability)),
  );

  if (candidates.length === 0) {
    return err(new NoHealthyRegionError(options.requiredCapability));
  }

  if (options.preferredRegionId !== undefined) {
    const preferred = candidates.find((r) => r.id === options.preferredRegionId);
    if (preferred !== undefined) {
      return ok({
        regionId: preferred.id,
        region: preferred,
        strategy: options.strategy,
      });
    }
  }

  switch (options.strategy) {
    case "primary":
      return routePrimary(candidates, options.strategy);
    case "nearest":
      return routeNearest(candidates, options);
    case "round-robin":
      return routeRoundRobin(candidates, options.strategy);
    case "latency-weighted":
      return routePrimary(candidates, options.strategy);
  }
}

function routePrimary(
  candidates: ReadonlyArray<Region>,
  strategy: RoutingStrategy,
): Result<RouteResult, NoHealthyRegionError> {
  const primary = candidates.find((r) => r.tier === "primary") ?? candidates[0];
  if (primary === undefined) {
    return err(new NoHealthyRegionError());
  }
  return ok({ regionId: primary.id, region: primary, strategy });
}

function routeNearest(
  candidates: ReadonlyArray<Region>,
  options: RouterOptions,
): Result<RouteResult, NoHealthyRegionError> {
  if (options.originCoordinates === undefined) {
    return routePrimary(candidates, options.strategy);
  }
  const origin: Region = {
    id: "origin" as RegionId,
    name: "origin",
    displayName: "origin",
    tier: "edge",
    status: "healthy",
    capabilities: [],
    coordinates: options.originCoordinates,
    provider: "mock",
    availabilityZones: ["az-1"],
    endpoints: { api: "http://localhost", internal: "http://localhost" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const sorted = [...candidates].sort(
    (a, b) => regionDistance(origin, a) - regionDistance(origin, b),
  );
  const nearest = sorted[0];
  if (nearest === undefined) {
    return err(new NoHealthyRegionError());
  }
  return ok({
    regionId: nearest.id,
    region: nearest,
    strategy: options.strategy,
    distanceKm: regionDistance(origin, nearest),
  });
}

function routeRoundRobin(
  candidates: ReadonlyArray<Region>,
  strategy: RoutingStrategy,
): Result<RouteResult, NoHealthyRegionError> {
  const idx = roundRobinIndex % candidates.length;
  roundRobinIndex = (roundRobinIndex + 1) % candidates.length;
  const selected = candidates[idx];
  if (selected === undefined) {
    return err(new NoHealthyRegionError());
  }
  return ok({ regionId: selected.id, region: selected, strategy });
}
