// Defines the compatibility matrix between API versions (breaking vs non-breaking changes).

import { ApiVersion, apiVersion, versionString, compareVersions, SUPPORTED_VERSIONS } from "./version.js";

export type CompatibilityLevel = "full" | "partial" | "breaking" | "incompatible";

export interface CompatibilityEntry {
  readonly from: ApiVersion;
  readonly to: ApiVersion;
  readonly level: CompatibilityLevel;
  readonly notes: string;
}

/**
 * Compatibility matrix: describes what happens when a client using `from`
 * talks to a server serving `to`.
 */
const COMPAT_MATRIX: readonly CompatibilityEntry[] = Object.freeze([
  {
    from: apiVersion("2024-01-01"),
    to: apiVersion("2024-06-01"),
    level: "partial",
    notes: "Error envelope changed; pagination cursor format updated.",
  },
  {
    from: apiVersion("2024-01-01"),
    to: apiVersion("2025-01-01"),
    level: "breaking",
    notes: "Streaming endpoints added; claim schema extended with provenance fields.",
  },
  {
    from: apiVersion("2024-01-01"),
    to: apiVersion("2025-06-01"),
    level: "incompatible",
    notes: "Multiple breaking changes across two major versions.",
  },
  {
    from: apiVersion("2024-06-01"),
    to: apiVersion("2025-01-01"),
    level: "partial",
    notes: "Provenance fields added as optional; streaming is additive.",
  },
  {
    from: apiVersion("2024-06-01"),
    to: apiVersion("2025-06-01"),
    level: "breaking",
    notes: "Agent schema and verdict envelope changed significantly.",
  },
  {
    from: apiVersion("2025-01-01"),
    to: apiVersion("2025-06-01"),
    level: "partial",
    notes: "Agent tool-call format updated; backwards-compatible shim available.",
  },
]);

export function getCompatibility(
  from: ApiVersion,
  to: ApiVersion
): CompatibilityEntry | undefined {
  const fs = versionString(from);
  const ts = versionString(to);

  if (fs === ts) {
    return { from, to, level: "full", notes: "Same version." };
  }

  // Normalize: always look up lower -> higher
  const [lo, hi] =
    compareVersions(from, to) < 0 ? [from, to] : [to, from];

  return COMPAT_MATRIX.find(
    (e) =>
      versionString(e.from) === versionString(lo) &&
      versionString(e.to) === versionString(hi)
  );
}

export function isCompatible(
  from: ApiVersion,
  to: ApiVersion
): boolean {
  const entry = getCompatibility(from, to);
  if (!entry) return false;
  return entry.level === "full" || entry.level === "partial";
}

export function compatibilityMatrix(): readonly CompatibilityEntry[] {
  return COMPAT_MATRIX;
}

export function versionsCompatibleWith(
  target: ApiVersion
): readonly ApiVersion[] {
  return SUPPORTED_VERSIONS.filter(
    (v) => versionString(v) !== versionString(target) && isCompatible(v, target)
  );
}
