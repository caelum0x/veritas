// Tracks deprecation policies per API version, including sunset dates and migration guides.

import { ApiVersion, apiVersion, versionString, isBefore } from "./version.js";

export interface DeprecationPolicy {
  readonly version: ApiVersion;
  readonly deprecatedAt: string;
  readonly sunsetAt: string;
  readonly reason: string;
  readonly migrationGuide: string;
}

const DEPRECATION_REGISTRY: readonly DeprecationPolicy[] = Object.freeze([
  {
    version: apiVersion("2024-01-01"),
    deprecatedAt: "2024-09-01",
    sunsetAt: "2025-03-01",
    reason: "Replaced by 2024-06-01 with improved error envelope and pagination.",
    migrationGuide: "https://docs.veritas.dev/migration/2024-01-01-to-2024-06-01",
  },
  {
    version: apiVersion("2024-06-01"),
    deprecatedAt: "2025-03-01",
    sunsetAt: "2025-12-01",
    reason: "Replaced by 2025-01-01 with streaming support and enhanced provenance fields.",
    migrationGuide: "https://docs.veritas.dev/migration/2024-06-01-to-2025-01-01",
  },
]);

export function getDeprecationPolicy(
  version: ApiVersion
): DeprecationPolicy | undefined {
  const s = versionString(version);
  return DEPRECATION_REGISTRY.find((p) => versionString(p.version) === s);
}

export function isDeprecated(version: ApiVersion, asOf?: string): boolean {
  const policy = getDeprecationPolicy(version);
  if (!policy) return false;
  const date = asOf ?? new Date().toISOString().slice(0, 10);
  return date >= policy.deprecatedAt;
}

export function isSunset(version: ApiVersion, asOf?: string): boolean {
  const policy = getDeprecationPolicy(version);
  if (!policy) return false;
  const date = asOf ?? new Date().toISOString().slice(0, 10);
  return date >= policy.sunsetAt;
}

export function allDeprecations(): readonly DeprecationPolicy[] {
  return DEPRECATION_REGISTRY;
}

export function activeDeprecations(asOf?: string): readonly DeprecationPolicy[] {
  const date = asOf ?? new Date().toISOString().slice(0, 10);
  return DEPRECATION_REGISTRY.filter(
    (p) => date >= p.deprecatedAt && date < p.sunsetAt
  );
}
