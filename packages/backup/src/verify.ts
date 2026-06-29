// verify.ts: verifies backup integrity by recomputing checksums against stored manifests.
import { sha256Hex, ok, err, type Result } from "@veritas/core";
import type { BackupManifest, BackupId } from "./types.js";
import type { BackupStorePort } from "./store.js";
import { BackupNotFoundError, BackupCorruptError } from "./errors.js";
import type { BackupError } from "./errors.js";
import { assembleSnapshot } from "./snapshot.js";

export interface VerifyResult {
  readonly id: BackupId;
  readonly ok: boolean;
  readonly detail?: string;
}

/** Verify one backup by reassembling its snapshot and comparing checksums. */
export async function verifyBackup(
  id: BackupId,
  store: BackupStorePort,
): Promise<Result<VerifyResult, BackupError>> {
  const manifestResult = await store.loadManifest(id);
  if (!manifestResult.ok) return manifestResult;

  const manifest = manifestResult.value;
  const assembleResult = await assembleSnapshot(manifest.snapshotId, store);
  if (!assembleResult.ok) return assembleResult;

  const actual = sha256Hex(assembleResult.value);
  if (actual !== manifest.checksum) {
    return err(
      new BackupCorruptError(
        id,
        `expected checksum ${manifest.checksum}, got ${actual}`,
      ),
    );
  }

  return ok({ id, ok: true });
}

/** Verify all backups in the store, returning per-id results. */
export async function verifyAll(
  store: BackupStorePort,
): Promise<Result<readonly VerifyResult[], BackupError>> {
  const listResult = await store.listManifests();
  if (!listResult.ok) return listResult;

  const results: VerifyResult[] = [];
  for (const manifest of listResult.value) {
    const r = await verifyBackup(manifest.id, store);
    if (r.ok) {
      results.push(r.value);
    } else {
      results.push({ id: manifest.id, ok: false, detail: r.error.message });
    }
  }

  return ok(results);
}
