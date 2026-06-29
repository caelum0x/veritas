// Public surface re-export for @veritas/backup.
export type { BackupPort, BackupOptions, BackupFilter } from "./backup.js";
export type { BackupStorePort, BackupChunk } from "./store.js";
export { InMemoryBackupStore } from "./store.js";
export type {
  BackupTarget,
  BackupManifest,
  BackupId,
  SnapshotId,
  ScheduleId,
  RetentionPolicy,
  BackupSchedule,
} from "./types.js";
export { newBackupId, newSnapshotId, newScheduleId } from "./types.js";
export type { SnapshotResult } from "./snapshot.js";
export { captureSnapshot, assembleSnapshot } from "./snapshot.js";
export type { ManifestInput } from "./manifest.js";
export { buildManifest, withExpiry } from "./manifest.js";
export type { RestoreOptions, RestoreResult } from "./restore.js";
export { restoreBackup, resolveRestoreChain } from "./restore.js";
export type { RetentionResult } from "./retention.js";
export { evaluateRetention, applyRetention } from "./retention.js";
export type { CreateScheduleInput, UpdateScheduleInput, ScheduleStorePort } from "./schedule.js";
export { ScheduleService, InMemoryScheduleStore } from "./schedule.js";
export type { VerifyResult } from "./verify.js";
export { verifyBackup, verifyAll } from "./verify.js";
export type { EncryptionHook } from "./encryption.js";
export { NoOpEncryptionHook, DevXorEncryptionHook, EncryptionRegistry } from "./encryption.js";
export type { BackupError } from "./errors.js";
export {
  BackupNotFoundError,
  BackupCorruptError,
  BackupEncryptionError,
  BackupStoreError,
  BackupScheduleError,
} from "./errors.js";
