// KMS provider port — interface and in-memory mock for KEK/DEK key-wrapping operations.
import { Result, ok, err } from "@veritas/core";
import { randomBytes } from "node:crypto";
import { encrypt, decrypt } from "@veritas/crypto";
import type { KekId } from "./types.js";
import { KeyHierarchyError } from "./errors.js";

/** Port interface for a Key Management Service providing KEK operations. */
export interface KmsProvider {
  /** Generate and store a new KEK, returning its id. */
  generateKek(): Promise<Result<KekId, KeyHierarchyError>>;
  /** Encrypt (wrap) a DEK using the KEK identified by kekId. */
  encryptDek(kekId: KekId, dekBytes: Buffer): Promise<Result<Buffer, KeyHierarchyError>>;
  /** Decrypt (unwrap) a wrapped DEK using the KEK identified by kekId. */
  decryptDek(kekId: KekId, encryptedDek: Buffer): Promise<Result<Buffer, KeyHierarchyError>>;
  /** Rotate a KEK: generates a new one and retires the old id; returns the new KEK id. */
  rotateKek(oldKekId: KekId): Promise<Result<KekId, KeyHierarchyError>>;
  /** List all known KEK ids. */
  listKekIds(): Promise<Result<readonly KekId[], KeyHierarchyError>>;
}

/** In-memory KMS provider for testing and local development. */
export class InMemoryKmsProvider implements KmsProvider {
  private readonly store = new Map<KekId, Buffer>();

  async generateKek(): Promise<Result<KekId, KeyHierarchyError>> {
    try {
      const id = `kek_${randomBytes(16).toString("hex")}` as KekId;
      const keyMaterial = randomBytes(32);
      this.store.set(id, keyMaterial);
      return ok(id);
    } catch (e) {
      return err(new KeyHierarchyError("Failed to generate KEK", e));
    }
  }

  async encryptDek(kekId: KekId, dekBytes: Buffer): Promise<Result<Buffer, KeyHierarchyError>> {
    const kek = this.store.get(kekId);
    if (!kek) return err(new KeyHierarchyError(`KEK not found: ${kekId}`));
    const result = encrypt(dekBytes, kek);
    if (!result.ok) return err(new KeyHierarchyError("DEK encryption failed", result.error));
    return ok(result.value.data);
  }

  async decryptDek(kekId: KekId, encryptedDek: Buffer): Promise<Result<Buffer, KeyHierarchyError>> {
    const kek = this.store.get(kekId);
    if (!kek) return err(new KeyHierarchyError(`KEK not found: ${kekId}`));
    const result = decrypt({ data: encryptedDek }, kek);
    if (!result.ok) return err(new KeyHierarchyError("DEK decryption failed", result.error));
    return ok(result.value);
  }

  async rotateKek(oldKekId: KekId): Promise<Result<KekId, KeyHierarchyError>> {
    if (!this.store.has(oldKekId)) {
      return err(new KeyHierarchyError(`Cannot rotate unknown KEK: ${oldKekId}`));
    }
    return this.generateKek();
  }

  async listKekIds(): Promise<Result<readonly KekId[], KeyHierarchyError>> {
    return ok(Array.from(this.store.keys()));
  }
}
