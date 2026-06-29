// Shared domain types for the backup module.
import { type Brand, brand } from "@veritas/core";

export type BackupId = Brand<string, "BackupId">;
export const newBackupId = (v: string): BackupId => brand<string, "BackupId">(v);

export type SnapshotId = Brand<string, "SnapshotId">;
export const newSnapshotId = (v: string): SnapshotId => brand<string, "SnapshotId">(v);

export type ScheduleId = Brand<string, "ScheduleId">;
export const newScheduleId = (v: string): ScheduleId => brand<string, "ScheduleId">(v);

/** Identifies what is being backed up. */
export interface BackupTarget {
  readonly name: string;
  readonly kind: "database" | "filesystem" | "objectstore" | "config";
  /** Connection string or path, e.g. "postgres://…" or "/data/uploads". */
  readonly uri: string;
  /** Optional namespace/tenant label. */
  readonly namespace?: string;
}

export interface BackupManifest {
  readonly id: BackupId;
  readonly target: BackupTarget;
  readonly kind: "full" | "incremental";
  readonly parentId?: BackupId;
  readonly snapshotId: SnapshotId;
  readonly sizeBytes: number;
  readonly checksum: string;
  readonly encryptionKeyId?: string;
  readonly tags: Record<string, string>;
  readonly createdAt: string; // ISO timestamp
  readonly expiresAt?: string; // ISO timestamp, set by retention policy
}

export interface RetentionPolicy {
  /** Keep the most-recent N full backups. */
  readonly keepLastN: number;
  /** Keep all backups created within this many days. */
  readonly keepDays: number;
  /** Never delete backups with these tags. */
  readonly pinnedTags?: Record<string, string>;
}

export interface BackupSchedule {
  readonly id: ScheduleId;
  readonly target: BackupTarget;
  /** Cron expression, e.g. "0 2 * * *". */
  readonly cron: string;
  readonly kind: "full" | "incremental";
  readonly retention: RetentionPolicy;
  readonly enabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly nextRunAt?: string;
  readonly lastRunAt?: string;
  readonly tags?: Record<string, string>;
}
