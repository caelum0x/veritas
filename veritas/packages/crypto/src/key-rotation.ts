// Key rotation policy — schedules and enforces periodic key rotation via a KmsPort.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { KmsPort, KmsError } from "./kms.js";
import type { SymmetricKeyId, AsymmetricKeyId } from "./key.js";
import { KeyRotationError } from "./errors.js";

/** Policy configuration for automatic key rotation. */
export interface RotationPolicy {
  /** How often to rotate in milliseconds. */
  readonly intervalMs: number;
  /** Maximum number of past key ids to retain (for decryption of old data). */
  readonly retainCount?: number;
}

/** Default rotation policy: rotate every 30 days. */
export const DEFAULT_ROTATION_POLICY: Readonly<RotationPolicy> = {
  intervalMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  retainCount: 3,
};

/** Record tracking the last rotation timestamp for a key. */
export interface RotationRecord {
  readonly keyId: SymmetricKeyId | AsymmetricKeyId;
  readonly lastRotatedAt: number;
  readonly policy: RotationPolicy;
}

/** Determines whether a key is due for rotation according to its policy. */
export function isDueForRotation(record: RotationRecord, now = Date.now()): boolean {
  return now - record.lastRotatedAt >= record.policy.intervalMs;
}

/** In-memory rotation scheduler — tracks records and rotates keys on demand. */
export class KeyRotationScheduler {
  private readonly records = new Map<string, RotationRecord>();

  constructor(private readonly kms: KmsPort) {}

  /** Register a symmetric key for automatic rotation tracking. */
  registerSymmetricKey(
    keyId: SymmetricKeyId,
    policy: RotationPolicy = DEFAULT_ROTATION_POLICY,
  ): void {
    this.records.set(keyId, { keyId, lastRotatedAt: Date.now(), policy });
  }

  /** Register an asymmetric key pair for automatic rotation tracking. */
  registerKeyPair(
    keyId: AsymmetricKeyId,
    policy: RotationPolicy = DEFAULT_ROTATION_POLICY,
  ): void {
    this.records.set(keyId, { keyId, lastRotatedAt: Date.now(), policy });
  }

  /** Returns all rotation records whose keys are due for rotation. */
  getDueKeys(now = Date.now()): readonly RotationRecord[] {
    return Array.from(this.records.values()).filter((r) => isDueForRotation(r, now));
  }

  /**
   * Rotates a single symmetric key and updates its rotation record.
   * Returns the new version number on success.
   */
  async rotateSymmetricKey(
    keyId: SymmetricKeyId,
  ): Promise<Result<number, KmsError>> {
    const result = await this.kms.rotateSymmetricKey(keyId);
    if (!result.ok) return result;
    const existing = this.records.get(keyId);
    const policy = existing?.policy ?? DEFAULT_ROTATION_POLICY;
    this.records.set(keyId, { keyId, lastRotatedAt: Date.now(), policy });
    return ok(result.value.version);
  }

  /**
   * Rotates a single asymmetric key pair and updates its rotation record.
   * Returns the new version number on success.
   */
  async rotateKeyPair(
    keyId: AsymmetricKeyId,
  ): Promise<Result<number, KmsError>> {
    const result = await this.kms.rotateKeyPair(keyId);
    if (!result.ok) return result;
    const existing = this.records.get(keyId);
    const policy = existing?.policy ?? DEFAULT_ROTATION_POLICY;
    this.records.set(keyId, { keyId, lastRotatedAt: Date.now(), policy });
    return ok(result.value.version);
  }

  /**
   * Rotates all keys that are due for rotation.
   * Returns a summary of how many keys were successfully rotated.
   */
  async rotateDueKeys(now = Date.now()): Promise<Result<number, KeyRotationError>> {
    const due = this.getDueKeys(now);
    let rotated = 0;
    const errors: string[] = [];

    for (const record of due) {
      const id = record.keyId;
      // Determine key type by checking what the KMS holds
      const symResult = await this.kms.getSymmetricKey(id as SymmetricKeyId);
      if (symResult.ok) {
        const r = await this.rotateSymmetricKey(id as SymmetricKeyId);
        if (r.ok) rotated++;
        else errors.push(id);
        continue;
      }
      const pairResult = await this.kms.getKeyPair(id as AsymmetricKeyId);
      if (pairResult.ok) {
        const r = await this.rotateKeyPair(id as AsymmetricKeyId);
        if (r.ok) rotated++;
        else errors.push(id);
        continue;
      }
      errors.push(id);
    }

    if (errors.length > 0) {
      return err(new KeyRotationError(`Failed to rotate keys: ${errors.join(", ")}`));
    }
    return ok(rotated);
  }

  /** Returns the rotation record for a given key id, or undefined if not registered. */
  getRecord(keyId: string): RotationRecord | undefined {
    return this.records.get(keyId);
  }

  /** Returns all currently registered rotation records. */
  getAllRecords(): readonly RotationRecord[] {
    return Array.from(this.records.values());
  }
}
