// restore.ts: orchestrates restoring a backup to a target from stored snapshot data.
import { ok, err, sha256Hex, type Result } from "@veritas/core";
import type { BackupId, BackupManifest } from "./types.js";
import type { BackupStorePort } from "./store.js";
import type { EncryptionHook } from "./encryption.js";
import { NoOpEncryptionHook } from "./encryption.js";
import { BackupCorruptError, BackupEncryptionError } from "./errors.js";
import type { BackupError } from "./errors.js";
import { assembleSnapshot } from "./snapshot.js";

export interface RestoreOptions {
  /** Override the target URI to restore into a different location. */
  readonly targetUri?: string;
  /** Skip checksum verification (not recommended for production). */
  readonly skipVerify?: boolean;
}

export interface RestoreResult {
  readonly manifest: BackupManifest;
  /** Reassembled plaintext data. Consumer is responsible for writing to target. */
  readonly data: Uint8Array;
  readonly sizeBytes: number;
}

/** Restore a backup by id, returning the decrypted data for the caller to apply. */
export async function restoreBackup(
  id: BackupId,
  store: BackupStorePort,
  opts: RestoreOptions = {},
  encryption: EncryptionHook = new NoOpEncryptionHook(),
): Promise<Result<RestoreResult, BackupError>> {
  // 1. Load manifest.
  const manifestResult = await store.loadManifest(id);
  if (!manifestResult.ok) return manifestResult;
  const manifest = manifestResult.value;

  // 2. Reassemble chunks.
  const assembleResult = await assembleSnapshot(manifest.snapshotId, store);
  if (!assembleResult.ok) return assembleResult;
  let data = assembleResult.value;

  // 3. Decrypt if needed.
  if (manifest.encryptionKeyId) {
    const decryptResult = await encryption.decrypt(data, manifest.encryptionKeyId);
    if (!decryptResult.ok) return decryptResult;
    data = decryptResult.value;
  }

  // 4. Verify checksum unless opted out.
  if (!opts.skipVerify) {
    const actual = sha256Hex(data);
    if (actual !== manifest.checksum) {
      return err(
        new BackupCorruptError(
          id,
          `checksum mismatch: expected ${manifest.checksum}, got ${actual}`,
        ),
      );
    }
  }

  return ok({ manifest, data, sizeBytes: data.byteLength });
}

/**
 * Resolve the restore chain for an incremental backup by walking parent links.
 * Returns manifests in order from oldest (full) to newest (the requested id).
 */
export async function resolveRestoreChain(
  id: BackupId,
  store: BackupStorePort,
): Promise<Result<readonly BackupManifest[], BackupError>> {
  const chain: BackupManifest[] = [];
  let currentId: BackupId | undefined = id;

  while (currentId !== undefined) {
    const result = await store.loadManifest(currentId);
    if (!result.ok) return result;
    chain.unshift(result.value); // prepend so oldest is first
    currentId = result.value.parentId;
  }

  return ok(chain);
}
