// Snapshot diff: compute structural differences between two corpus snapshots.

import { type CorpusRecord } from "./record.js";
import { type CorpusSnapshot } from "./snapshot.js";
import { type DiffMode } from "./types.js";

export type DiffChangeKind = "added" | "removed" | "modified";

export interface RecordDiff {
  readonly kind: DiffChangeKind;
  readonly recordId: string;
  readonly before: CorpusRecord | null;
  readonly after: CorpusRecord | null;
}

export interface SnapshotDiff {
  readonly fromSnapshotId: string;
  readonly toSnapshotId: string;
  readonly added: readonly RecordDiff[];
  readonly removed: readonly RecordDiff[];
  readonly modified: readonly RecordDiff[];
  readonly totalChanges: number;
}

export interface DiffInput {
  readonly snapshot: CorpusSnapshot;
  readonly records: readonly CorpusRecord[];
}

type RecordMap = ReadonlyMap<string, CorpusRecord>;

function buildMap(records: readonly CorpusRecord[]): RecordMap {
  return new Map(records.map((r) => [r.id, r]));
}

function isModified(a: CorpusRecord, b: CorpusRecord): boolean {
  return (
    a.authorityWeight !== b.authorityWeight ||
    a.qualityScore !== b.qualityScore ||
    a.contentHash !== b.contentHash ||
    a.notes !== b.notes ||
    a.curatedBy !== b.curatedBy ||
    JSON.stringify(a.tags) !== JSON.stringify(b.tags)
  );
}

export function diffSnapshots(from: DiffInput, to: DiffInput): SnapshotDiff {
  const fromMap = buildMap(from.records);
  const toMap = buildMap(to.records);

  const added: RecordDiff[] = [];
  const removed: RecordDiff[] = [];
  const modified: RecordDiff[] = [];

  for (const [id, afterRecord] of toMap) {
    const beforeRecord = fromMap.get(id);
    if (beforeRecord === undefined) {
      added.push({ kind: "added", recordId: id, before: null, after: afterRecord });
    } else if (isModified(beforeRecord, afterRecord)) {
      modified.push({ kind: "modified", recordId: id, before: beforeRecord, after: afterRecord });
    }
  }

  for (const [id, beforeRecord] of fromMap) {
    if (!toMap.has(id)) {
      removed.push({ kind: "removed", recordId: id, before: beforeRecord, after: null });
    }
  }

  return {
    fromSnapshotId: from.snapshot.id,
    toSnapshotId: to.snapshot.id,
    added,
    removed,
    modified,
    totalChanges: added.length + removed.length + modified.length,
  };
}

export function filterDiff(diff: SnapshotDiff, mode: DiffMode): readonly RecordDiff[] {
  switch (mode) {
    case "added": return diff.added;
    case "removed": return diff.removed;
    case "changed": return diff.modified;
    case "all": return [...diff.added, ...diff.removed, ...diff.modified];
  }
}

export function summarizeDiff(diff: SnapshotDiff): string {
  return (
    `Diff ${diff.fromSnapshotId} → ${diff.toSnapshotId}: ` +
    `+${diff.added.length} added, -${diff.removed.length} removed, ~${diff.modified.length} modified ` +
    `(${diff.totalChanges} total)`
  );
}
