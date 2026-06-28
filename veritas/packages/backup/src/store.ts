// Backup store port: abstracts physical storage of backup data and manifests.
import type { Result } from "@veritas/core";
import type { BackupManifest, BackupId, SnapshotId } from "./types.js";
import type { BackupError } from "./errors.js";

/** Raw chunk of backup data (streams abstracted as buffers for simplicity). */
export interface BackupChunk {
  readonly snapshotId: SnapshotId;
  readonly index: number;
  readonly data: Uint8Array;
  readonly checksum: string;
}

/** Port interface for persisting and retrieving backup artifacts. */
export interface BackupStorePort {
  /** Persist a manifest record. */
  saveManifest(manifest: BackupManifest): Promise<Result<void, BackupError>>;

  /** Load a manifest by id. */
  loadManifest(id: BackupId): Promise<Result<BackupManifest, BackupError>>;

  /** List manifests, newest first. */
  listManifests(filter?: { target?: string; kind?: "full" | "incremental"; since?: string; limit?: number }): Promise<Result<readonly BackupManifest[], BackupError>>;

  /** Delete manifest (and associated chunks). */
  deleteManifest(id: BackupId): Promise<Result<void, BackupError>>;

  /** Write a data chunk. */
  writeChunk(chunk: BackupChunk): Promise<Result<void, BackupError>>;

  /** Read all chunks for a snapshot, ordered by index. */
  readChunks(snapshotId: SnapshotId): Promise<Result<readonly BackupChunk[], BackupError>>;

  /** Remove all chunks associated with a snapshot. */
  deleteChunks(snapshotId: SnapshotId): Promise<Result<void, BackupError>>;
}

/** In-memory implementation for testing and development. */
export class InMemoryBackupStore implements BackupStorePort {
  private readonly manifests = new Map<string, BackupManifest>();
  private readonly chunks = new Map<string, BackupChunk[]>();

  async saveManifest(manifest: BackupManifest): Promise<Result<void, BackupError>> {
    this.manifests.set(manifest.id, manifest);
    return { ok: true, value: undefined };
  }

  async loadManifest(id: BackupId): Promise<Result<BackupManifest, BackupError>> {
    const m = this.manifests.get(id);
    if (!m) {
      const { BackupNotFoundError } = await import("./errors.js");
      return { ok: false, error: new BackupNotFoundError(id) };
    }
    return { ok: true, value: m };
  }

  async listManifests(filter?: { target?: string; kind?: "full" | "incremental"; since?: string; limit?: number }): Promise<Result<readonly BackupManifest[], BackupError>> {
    let list = [...this.manifests.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (filter?.target) list = list.filter((m) => m.target.name === filter.target);
    if (filter?.kind) list = list.filter((m) => m.kind === filter.kind);
    if (filter?.since) {
      const since = new Date(filter.since).getTime();
      list = list.filter((m) => new Date(m.createdAt).getTime() >= since);
    }
    if (filter?.limit) list = list.slice(0, filter.limit);
    return { ok: true, value: list };
  }

  async deleteManifest(id: BackupId): Promise<Result<void, BackupError>> {
    this.manifests.delete(id);
    return { ok: true, value: undefined };
  }

  async writeChunk(chunk: BackupChunk): Promise<Result<void, BackupError>> {
    const key = chunk.snapshotId;
    const existing = this.chunks.get(key) ?? [];
    this.chunks.set(key, [...existing, chunk]);
    return { ok: true, value: undefined };
  }

  async readChunks(snapshotId: SnapshotId): Promise<Result<readonly BackupChunk[], BackupError>> {
    const list = (this.chunks.get(snapshotId) ?? []).slice().sort((a, b) => a.index - b.index);
    return { ok: true, value: list };
  }

  async deleteChunks(snapshotId: SnapshotId): Promise<Result<void, BackupError>> {
    this.chunks.delete(snapshotId);
    return { ok: true, value: undefined };
  }
}
