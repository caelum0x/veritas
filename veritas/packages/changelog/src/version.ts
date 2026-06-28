// Represents a semver version grouping all changelog entries for a release.
import { z } from "zod";
import type { IsoTimestamp } from "@veritas/core";
import { isoTimestampSchema } from "@veritas/core";
import type { ChangeEntry } from "./entry.js";
import { changeEntrySchema } from "./entry.js";

export const semverSchema = z
  .string()
  .regex(
    /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/,
    "Must be a valid semver string"
  );

export type Semver = z.infer<typeof semverSchema>;

export const versionedChangelogSchema = z.object({
  version: semverSchema,
  releasedAt: isoTimestampSchema,
  prerelease: z.boolean().default(false),
  yanked: z.boolean().default(false),
  yankedReason: z.string().optional(),
  entries: z.array(changeEntrySchema),
  summary: z.string().max(1000).optional(),
  createdAt: isoTimestampSchema,
});

export type VersionedChangelog = Readonly<z.infer<typeof versionedChangelogSchema>>;

export function makeVersionedChangelog(
  version: Semver,
  entries: readonly ChangeEntry[],
  releasedAt: IsoTimestamp,
  now: IsoTimestamp,
  options?: {
    readonly prerelease?: boolean;
    readonly summary?: string;
  }
): VersionedChangelog {
  return {
    version,
    releasedAt,
    prerelease: options?.prerelease ?? false,
    yanked: false,
    entries: [...entries],
    summary: options?.summary,
    createdAt: now,
  };
}

export function yankVersion(
  vc: VersionedChangelog,
  reason: string
): VersionedChangelog {
  return { ...vc, yanked: true, yankedReason: reason };
}

export function parseSemver(raw: string): readonly [number, number, number] {
  const match = raw.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) throw new Error(`Invalid semver: ${raw}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareSemver(a: Semver, b: Semver): number {
  const [aMaj, aMin, aPat] = parseSemver(a);
  const [bMaj, bMin, bPat] = parseSemver(b);
  if (aMaj !== bMaj) return aMaj - bMaj;
  if (aMin !== bMin) return aMin - bMin;
  return aPat - bPat;
}
