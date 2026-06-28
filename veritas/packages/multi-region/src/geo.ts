// Geo resolution: maps IP addresses and locale hints to geographic coordinates and region candidates.
import type { GeoCoordinates } from "./types.js";
import type { Region } from "./region.js";
import { regionDistance } from "./region.js";

export interface GeoContext {
  readonly ipAddress?: string;
  readonly countryCode?: string;
  readonly continentCode?: string;
  readonly coordinates?: GeoCoordinates;
}

export interface GeoResolutionPort {
  resolve(context: GeoContext): Promise<GeoCoordinates | undefined>;
}

/** Continent centroid coordinates used for coarse geo-routing when no IP resolution is available. */
const CONTINENT_CENTROIDS: Readonly<Record<string, GeoCoordinates>> = {
  AF: { lat: 7.19, lon: 21.09 },
  AN: { lat: -82.86, lon: 135.0 },
  AS: { lat: 29.84, lon: 89.3 },
  EU: { lat: 54.53, lon: 15.25 },
  NA: { lat: 46.07, lon: -100.55 },
  OC: { lat: -22.73, lon: 140.02 },
  SA: { lat: -14.27, lon: -51.94 },
};

/** Country centroid lookup (subset covering major markets). */
const COUNTRY_CENTROIDS: Readonly<Record<string, GeoCoordinates>> = {
  US: { lat: 37.09, lon: -95.71 },
  GB: { lat: 55.38, lon: -3.44 },
  DE: { lat: 51.17, lon: 10.45 },
  FR: { lat: 46.23, lon: 2.21 },
  JP: { lat: 36.2, lon: 138.25 },
  SG: { lat: 1.35, lon: 103.82 },
  AU: { lat: -25.27, lon: 133.78 },
  BR: { lat: -14.24, lon: -51.93 },
  IN: { lat: 20.59, lon: 78.96 },
  CA: { lat: 56.13, lon: -106.35 },
};

/** In-memory geo resolver using static centroid tables. */
export class StaticGeoResolutionPort implements GeoResolutionPort {
  async resolve(context: GeoContext): Promise<GeoCoordinates | undefined> {
    if (context.coordinates !== undefined) {
      return context.coordinates;
    }
    if (context.countryCode !== undefined) {
      const centroid = COUNTRY_CENTROIDS[context.countryCode.toUpperCase()];
      if (centroid !== undefined) return centroid;
    }
    if (context.continentCode !== undefined) {
      return CONTINENT_CENTROIDS[context.continentCode.toUpperCase()];
    }
    return undefined;
  }
}

/**
 * Ranks regions by ascending distance from the given origin coordinates.
 * Ties are broken by tier priority: primary > secondary > edge.
 */
export function rankRegionsByProximity(
  regions: ReadonlyArray<Region>,
  origin: GeoCoordinates,
): ReadonlyArray<Region & { distanceKm: number }> {
  const TIER_ORDER: Record<string, number> = { primary: 0, secondary: 1, edge: 2 };
  const originRegion: Region = {
    id: "__origin__" as Region["id"],
    name: "origin",
    displayName: "origin",
    tier: "edge",
    status: "healthy",
    capabilities: [],
    coordinates: origin,
    provider: "mock",
    availabilityZones: ["az-1"],
    endpoints: { api: "http://localhost", internal: "http://localhost" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return [...regions]
    .map((r) => ({ ...r, distanceKm: regionDistance(originRegion, r) }))
    .sort((a, b) => {
      const distDiff = a.distanceKm - b.distanceKm;
      if (Math.abs(distDiff) > 50) return distDiff;
      return (TIER_ORDER[a.tier as string] ?? 2) - (TIER_ORDER[b.tier as string] ?? 2);
    });
}
