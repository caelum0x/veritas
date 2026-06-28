// Generates Sunset and Deprecation HTTP response headers per RFC 8594.

import { ApiVersion, versionString } from "./version.js";
import { getDeprecationPolicy, isDeprecated } from "./deprecation.js";

export interface SunsetHeaders {
  readonly "Sunset"?: string;
  readonly "Deprecation"?: string;
  readonly "Link"?: string;
}

/**
 * Builds Sunset/Deprecation headers for a given version if applicable.
 * Returns an empty object if the version has no deprecation policy or is not yet deprecated.
 */
export function buildSunsetHeaders(
  version: ApiVersion,
  asOf?: string
): SunsetHeaders {
  if (!isDeprecated(version, asOf)) return {};

  const policy = getDeprecationPolicy(version);
  if (!policy) return {};

  const headers: Record<string, string> = {};

  // RFC 8594: Sunset header — HTTP-date format
  const sunsetDate = new Date(`${policy.sunsetAt}T00:00:00Z`);
  headers["Sunset"] = sunsetDate.toUTCString();

  // draft-ietf-httpapi-deprecation-header: ISO 8601 date
  const deprecationDate = new Date(`${policy.deprecatedAt}T00:00:00Z`);
  headers["Deprecation"] = deprecationDate.toUTCString();

  // Link header pointing to migration guide
  headers["Link"] = `<${policy.migrationGuide}>; rel="deprecation"`;

  return headers as SunsetHeaders;
}

/**
 * Applies sunset headers to a plain header map (mutates the provided record).
 */
export function applySunsetHeaders(
  version: ApiVersion,
  target: Record<string, string>,
  asOf?: string
): void {
  const headers = buildSunsetHeaders(version, asOf);
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      target[key] = value;
    }
  }
}

export function sunsetDateOf(version: ApiVersion): string | undefined {
  return getDeprecationPolicy(version)?.sunsetAt;
}

export function deprecationDateOf(version: ApiVersion): string | undefined {
  return getDeprecationPolicy(version)?.deprecatedAt;
}
