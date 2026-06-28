// snapshot.ts: creates point-in-time snapshot descriptors and chunked data capture.
import { newId, sha256Hex, ok, err, type Result } from "@veritas/core";
import { newSnapshotId, type BackupTarget, type SnapshotId } from "./types.js";
import type { BackupStorePort, BackupChunk } from "./store.js";
import { BackupStoreError } from "./errors.js";
import type { BackupError } from "./errors.js";

const CHUNK_SIZE = 65_536; // 64 KiB per chunk

export interface SnapshotResult {
  readonly snapshotId: SnapshotId;
  readonly sizeBytes: number;
  readonly checksum: string;
}

/**
 * Capture a snapshot of the given target data into the store.
 * In production this would stream data from the target URI; here it
 * accepts a raw buffer to remain dependency-free.
 */
export async function captureSnapshot(
  target: BackupTarget,
  data: Uint8Array,
  store: BackupStorePort,
): Promise<Result<SnapshotResult, BackupError>> {
  const snapshotId = newSnapshotId(newId("snap"));
  const chunks = splitIntoChunks(data, snapshotId);

  for (const chunk of chunks) {
    const result = await store.writeChunk(chunk);
    if (!result.ok) return result;
  }

  const checksum = sha256Hex(data);
  return ok({ snapshotId, sizeBytes: data.byteLength, checksum });
}

/** Reassemble snapshot chunks into a contiguous buffer. */
export async function assembleSnapshot(
  snapshotId: SnapshotId,
  store: BackupStorePort,
): Promise<Result<Uint8Array, BackupError>> {
  const result = await store.readChunks(snapshotId);
  if (!result.ok) return result;

  const chunks = result.value;
  if (chunks.length === 0) {
    return err(new BackupStoreError(`No chunks found for snapshot ${snapshotId}`));
  }

  const totalSize = chunks.reduce((acc, c) => acc + c.data.byteLength, 0);
  const buffer = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk.data, offset);
    offset += chunk.data.byteLength;
  }
  return ok(buffer);
}

function splitIntoChunks(data: Uint8Array, snapshotId: SnapshotId): readonly BackupChunk[] {
  const result: BackupChunk[] = [];
  let index = 0;
  let offset = 0;

  while (offset < data.byteLength) {
    const slice = data.slice(offset, offset + CHUNK_SIZE);
    const checksum = sha256Hex(slice);
    result.push({ snapshotId, index, data: slice, checksum });
    offset += slice.byteLength;
    index++;
  }

  // Ensure at least one chunk even for empty data.
  if (result.length === 0) {
    result.push({ snapshotId, index: 0, data: new Uint8Array(0), checksum: sha256Hex(new Uint8Array(0)) });
  }

  return result;
}
