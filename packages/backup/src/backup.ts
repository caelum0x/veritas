// Backup port: defines the primary interface for initiating and managing backups.
import type { Result } from "@veritas/core";
import type { BackupManifest, BackupId, BackupTarget } from "./types.js";
import type { BackupError } from "./errors.js";

/** Port interface for the backup subsystem. */
export interface BackupPort {
  /**
   * Create a full or incremental backup of the given target.
   * Returns a manifest describing the completed backup.
   */
  backup(target: BackupTarget, opts?: BackupOptions): Promise<Result<BackupManifest, BackupError>>;

  /** List all known backup manifests, newest first. */
  list(filter?: BackupFilter): Promise<Result<readonly BackupManifest[], BackupError>>;

  /** Retrieve a single manifest by id. */
  get(id: BackupId): Promise<Result<BackupManifest, BackupError>>;

  /** Delete a backup by id (removes stored data and manifest). */
  remove(id: BackupId): Promise<Result<void, BackupError>>;
}

export interface BackupOptions {
  readonly kind: "full" | "incremental";
  readonly tags?: Record<string, string>;
  /** If provided, encrypt the backup with this key id. */
  readonly encryptionKeyId?: string;
  /** Parent backup id for incremental backups. */
  readonly parentId?: BackupId;
}

export interface BackupFilter {
  readonly target?: string;
  readonly kind?: "full" | "incremental";
  readonly since?: string; // ISO timestamp
  readonly limit?: number;
}
