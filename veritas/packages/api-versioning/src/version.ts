// Defines API version value object and supported version registry.

import { Brand, brand, unbrand } from "@veritas/core";

export type ApiVersion = Brand<string, "ApiVersion">;

export function apiVersion(v: string): ApiVersion {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    throw new Error(`Invalid API version format: ${v}. Expected YYYY-MM-DD.`);
  }
  return brand<string, "ApiVersion">(v);
}

export function versionString(v: ApiVersion): string {
  return unbrand(v);
}

export function compareVersions(a: ApiVersion, b: ApiVersion): number {
  const as = unbrand(a);
  const bs = unbrand(b);
  if (as < bs) return -1;
  if (as > bs) return 1;
  return 0;
}

export const V2024_01_01 = apiVersion("2024-01-01");
export const V2024_06_01 = apiVersion("2024-06-01");
export const V2025_01_01 = apiVersion("2025-01-01");
export const V2025_06_01 = apiVersion("2025-06-01");

export const SUPPORTED_VERSIONS: readonly ApiVersion[] = [
  V2024_01_01,
  V2024_06_01,
  V2025_01_01,
  V2025_06_01,
];

export const LATEST_VERSION: ApiVersion = V2025_06_01;
export const MINIMUM_VERSION: ApiVersion = V2024_01_01;

export function isSupported(v: ApiVersion): boolean {
  const s = unbrand(v);
  return SUPPORTED_VERSIONS.some((sv) => unbrand(sv) === s);
}

export function isBefore(a: ApiVersion, b: ApiVersion): boolean {
  return compareVersions(a, b) < 0;
}

export function isAfter(a: ApiVersion, b: ApiVersion): boolean {
  return compareVersions(a, b) > 0;
}
