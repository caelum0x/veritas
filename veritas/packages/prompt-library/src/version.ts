// Prompt versioning — semver comparison and changelog tracking.
import { type PromptTemplate } from "./prompt.js";

export interface VersionInfo {
  readonly version: string;
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

export interface VersionedEntry {
  readonly version: string;
  readonly template: PromptTemplate;
  readonly changelog: string;
  readonly publishedAt: string;
}

/** Parse a semver string into its numeric parts. */
export function parseVersion(v: string): VersionInfo {
  const parts = v.split(".").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n) || n < 0)) {
    throw new Error(`Invalid semver: ${v}`);
  }
  const [major, minor, patch] = parts as [number, number, number];
  return { version: v, major, minor, patch };
}

/** Compare two semver strings. Returns negative if a < b, 0 if equal, positive if a > b. */
export function compareVersions(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (va.major !== vb.major) return va.major - vb.major;
  if (va.minor !== vb.minor) return va.minor - vb.minor;
  return va.patch - vb.patch;
}

/** Return true when version b is compatible (same major) with version a. */
export function isCompatible(a: string, b: string): boolean {
  return parseVersion(a).major === parseVersion(b).major;
}

/** Sort a list of versioned entries descending (newest first). */
export function sortByVersion(entries: readonly VersionedEntry[]): VersionedEntry[] {
  return [...entries].sort((x, y) => compareVersions(y.version, x.version));
}

/** Find the latest entry from a list. */
export function latestEntry(entries: readonly VersionedEntry[]): VersionedEntry | undefined {
  return sortByVersion(entries)[0];
}
