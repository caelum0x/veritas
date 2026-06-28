// Top-level changelog aggregate grouping versioned releases and migration notes.
import { z } from "zod";
import type { IsoTimestamp } from "@veritas/core";
import { isoTimestampSchema } from "@veritas/core";
import { versionedChangelogSchema, compareSemver } from "./version.js";
import type { VersionedChangelog, Semver } from "./version.js";
import { migrationNoteSchema } from "./migration-note.js";
import type { MigrationNote } from "./migration-note.js";
import type { ChangeEntry } from "./entry.js";
import type { ChangeCategory } from "./category.js";

export const changelogSchema = z.object({
  id: z.string().min(1),
  projectName: z.string().min(1).max(200),
  projectSlug: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  versions: z.array(versionedChangelogSchema),
  migrationNotes: z.array(migrationNoteSchema),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export type Changelog = Readonly<z.infer<typeof changelogSchema>>;

export function makeChangelog(
  id: string,
  projectName: string,
  projectSlug: string,
  now: IsoTimestamp,
  description?: string
): Changelog {
  return {
    id,
    projectName,
    projectSlug,
    description,
    versions: [],
    migrationNotes: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function addVersion(
  changelog: Changelog,
  version: VersionedChangelog,
  now: IsoTimestamp
): Changelog {
  const existing = changelog.versions.find((v) => v.version === version.version);
  if (existing) {
    throw new Error(`Version ${version.version} already exists in changelog`);
  }
  return {
    ...changelog,
    versions: [...changelog.versions, version].sort((a, b) =>
      compareSemver(b.version, a.version)
    ),
    updatedAt: now,
  };
}

export function addMigrationNote(
  changelog: Changelog,
  note: MigrationNote,
  now: IsoTimestamp
): Changelog {
  return {
    ...changelog,
    migrationNotes: [...changelog.migrationNotes, note],
    updatedAt: now,
  };
}

export function getVersion(
  changelog: Changelog,
  version: Semver
): VersionedChangelog | undefined {
  return changelog.versions.find((v) => v.version === version);
}

export function latestVersion(
  changelog: Changelog
): VersionedChangelog | undefined {
  return changelog.versions.find((v) => !v.prerelease && !v.yanked);
}

export function entriesForCategory(
  changelog: Changelog,
  category: ChangeCategory
): readonly ChangeEntry[] {
  return changelog.versions.flatMap((v) =>
    v.entries.filter((e) => e.category === category)
  );
}

export function breakingEntries(
  changelog: Changelog
): readonly ChangeEntry[] {
  return changelog.versions.flatMap((v) =>
    v.entries.filter((e) => e.breakingChange)
  );
}
