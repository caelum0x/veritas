// Semantic-version helpers for tracking tool descriptor versions.

import { z } from "zod";
import { Result, ok, err } from "@veritas/core";
import { InvalidToolDescriptorError } from "./errors.js";

/** Semantic version string in the form MAJOR.MINOR.PATCH. */
export type SemVer = string;

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;

export const semVerSchema = z
  .string()
  .regex(SEMVER_RE, "must be a valid semver string (MAJOR.MINOR.PATCH)");

/** Parse a raw string into a validated SemVer. */
export function parseSemVer(
  raw: string
): Result<SemVer, InvalidToolDescriptorError> {
  const result = semVerSchema.safeParse(raw);
  if (!result.success) {
    return err(
      new InvalidToolDescriptorError(`Invalid semver '${raw}': ${result.error.issues[0]?.message}`)
    );
  }
  return ok(raw as SemVer);
}

/** Compare two SemVer strings. Returns negative, 0, or positive. */
export function compareSemVer(a: SemVer, b: SemVer): number {
  const [aMaj = 0, aMin = 0, aPat = 0] = a.split(".").map(Number);
  const [bMaj = 0, bMin = 0, bPat = 0] = b.split(".").map(Number);
  if (aMaj !== bMaj) return aMaj - bMaj;
  if (aMin !== bMin) return aMin - bMin;
  return aPat - bPat;
}

/** Return the latest version from a non-empty list, or undefined for empty. */
export function latestVersion(versions: ReadonlyArray<SemVer>): SemVer | undefined {
  if (versions.length === 0) return undefined;
  return [...versions].sort(compareSemVer).at(-1);
}

/** Immutably record a new version entry for a tool. */
export interface VersionRecord {
  readonly version: SemVer;
  readonly registeredAt: string; // ISO timestamp
  readonly changelog?: string;
  readonly deprecated: boolean;
}

export function makeVersionRecord(
  version: SemVer,
  now: string,
  changelog?: string
): VersionRecord {
  return { version, registeredAt: now, changelog, deprecated: false };
}

/** Mark an existing version record as deprecated (immutable update). */
export function deprecateVersionRecord(record: VersionRecord): VersionRecord {
  return { ...record, deprecated: true };
}
