// manifest.ts: constructs and validates BackupManifest records.
import { newId, ok, type Result } from "@veritas/core";
import { newBackupId, type BackupManifest, type BackupTarget, type SnapshotId } from "./types.js";
import type { BackupError } from "./errors.js";
import type { BackupOptions } from "./backup.js";

export interface ManifestInput {
  readonly target: BackupTarget;
  readonly snapshotId: SnapshotId;
  readonly sizeBytes: number;
  readonly checksum: string;
  readonly opts: BackupOptions;
  readonly now: string; // ISO timestamp
}

/** Build an immutable BackupManifest from captured snapshot metadata. */
export function buildManifest(input: ManifestInput): Result<BackupManifest, BackupError> {
  const manifest: BackupManifest = {
    id: newBackupId(newId("backup")),
    target: input.target,
    kind: input.opts.kind,
    parentId: input.opts.parentId,
    snapshotId: input.snapshotId,
    sizeBytes: input.sizeBytes,
    checksum: input.checksum,
    encryptionKeyId: input.opts.encryptionKeyId,
    tags: input.opts.tags ?? {},
    createdAt: input.now,
  };
  return ok(manifest);
}

/** Apply an expiry date to an existing manifest (returns new object). */
export function withExpiry(manifest: BackupManifest, expiresAt: string): BackupManifest {
  return { ...manifest, expiresAt };
}
