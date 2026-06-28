// In-memory store for changelog entries and versioned releases.
import { ok, err, newId } from "@veritas/core";
import type { Result, Clock, IsoTimestamp } from "@veritas/core";
import type { ChangeEntry, CreateChangeEntry } from "./entry.js";
import { makeEntry } from "./entry.js";
import type { VersionedChangelog } from "./version.js";
import { makeVersionedChangelog, compareSemver, yankVersion } from "./version.js";
import type { Semver } from "./version.js";
import type { MigrationNote, CreateMigrationNote } from "./migration-note.js";
import { makeMigrationNote, updateMigrationNote } from "./migration-note.js";
import type { ChangelogFilter } from "./types.js";
import {
  ChangelogNotFoundError,
  ChangelogVersionConflictError,
  ChangelogValidationError,
} from "./errors.js";

export interface ChangelogStore {
  addEntry(input: CreateChangeEntry): Result<ChangeEntry, ChangelogValidationError>;
  getEntry(id: string): Result<ChangeEntry, ChangelogNotFoundError>;
  listEntries(filter?: ChangelogFilter): readonly ChangeEntry[];
  releaseVersion(
    version: Semver,
    entryIds: readonly string[],
    releasedAt: IsoTimestamp,
    options?: { readonly prerelease?: boolean; readonly summary?: string }
  ): Result<VersionedChangelog, ChangelogVersionConflictError | ChangelogNotFoundError>;
  getVersion(version: Semver): Result<VersionedChangelog, ChangelogNotFoundError>;
  listVersions(): readonly VersionedChangelog[];
  yankVersion(version: Semver, reason: string): Result<VersionedChangelog, ChangelogNotFoundError>;
  addMigrationNote(input: CreateMigrationNote): Result<MigrationNote, ChangelogValidationError>;
  getMigrationNote(id: string): Result<MigrationNote, ChangelogNotFoundError>;
  listMigrationNotes(): readonly MigrationNote[];
  updateMigrationNote(
    id: string,
    patch: Partial<Omit<MigrationNote, "id" | "fromVersion" | "toVersion" | "createdAt" | "updatedAt">>
  ): Result<MigrationNote, ChangelogNotFoundError>;
}

export function createChangelogStore(clock: Clock): ChangelogStore {
  const entries = new Map<string, ChangeEntry>();
  const versions = new Map<Semver, VersionedChangelog>();
  const migrationNotes = new Map<string, MigrationNote>();

  function sortedVersions(): readonly VersionedChangelog[] {
    return [...versions.values()].sort((a, b) => compareSemver(b.version, a.version));
  }

  return {
    addEntry(input) {
      const now = clock.nowIso();
      const id = input.id ?? newId("entry");
      if (entries.has(id)) {
        return err(new ChangelogValidationError(`Entry with id already exists: ${id}`, { id }));
      }
      const entry = makeEntry({ ...input, id }, now);
      entries.set(entry.id, entry);
      return ok(entry);
    },

    getEntry(id) {
      const entry = entries.get(id);
      if (!entry) return err(new ChangelogNotFoundError(id));
      return ok(entry);
    },

    listEntries(filter?: ChangelogFilter) {
      let list = [...entries.values()];
      if (filter?.version) list = list.filter((e) => e.version === filter.version);
      if (filter?.categories?.length) {
        list = list.filter((e) => filter.categories!.includes(e.category));
      }
      if (filter?.breakingOnly) list = list.filter((e) => e.breakingChange);
      if (filter?.tags?.length) {
        list = list.filter((e) => filter.tags!.some((t) => e.tags.includes(t)));
      }
      if (filter?.since) {
        list = list.filter((e) => e.publishedAt >= (filter.since as string));
      }
      if (filter?.until) {
        list = list.filter((e) => e.publishedAt <= (filter.until as string));
      }
      list.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
      if (filter?.offset) list = list.slice(filter.offset);
      if (filter?.limit) list = list.slice(0, filter.limit);
      return list;
    },

    releaseVersion(version, entryIds, releasedAt, options) {
      if (versions.has(version)) {
        return err(new ChangelogVersionConflictError(version));
      }
      const resolved: ChangeEntry[] = [];
      for (const id of entryIds) {
        const entry = entries.get(id);
        if (!entry) return err(new ChangelogNotFoundError(id));
        resolved.push(entry);
      }
      const now = clock.nowIso();
      const vc = makeVersionedChangelog(version, resolved, releasedAt, now, options);
      versions.set(version, vc);
      return ok(vc);
    },

    getVersion(version) {
      const vc = versions.get(version);
      if (!vc) return err(new ChangelogNotFoundError(version));
      return ok(vc);
    },

    listVersions() {
      return sortedVersions();
    },

    yankVersion(version, reason) {
      const vc = versions.get(version);
      if (!vc) return err(new ChangelogNotFoundError(version));
      const yanked = yankVersion(vc, reason);
      versions.set(version, yanked);
      return ok(yanked);
    },

    addMigrationNote(input) {
      const now = clock.nowIso();
      if (migrationNotes.has(input.id)) {
        return err(new ChangelogValidationError(`Migration note already exists: ${input.id}`, { id: input.id }));
      }
      const note = makeMigrationNote(input, now);
      migrationNotes.set(note.id, note);
      return ok(note);
    },

    getMigrationNote(id) {
      const note = migrationNotes.get(id);
      if (!note) return err(new ChangelogNotFoundError(id));
      return ok(note);
    },

    listMigrationNotes() {
      return [...migrationNotes.values()];
    },

    updateMigrationNote(id, patch) {
      const note = migrationNotes.get(id);
      if (!note) return err(new ChangelogNotFoundError(id));
      const now = clock.nowIso();
      const updated = updateMigrationNote(note, patch, now);
      migrationNotes.set(id, updated);
      return ok(updated);
    },
  };
}
