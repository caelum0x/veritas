// encryption.ts: hook interface for encrypting/decrypting backup payloads.
import { ok, err, type Result } from "@veritas/core";
import { BackupEncryptionError } from "./errors.js";
import type { BackupError } from "./errors.js";

/** Port interface: swap in a real KMS-backed implementation for production. */
export interface EncryptionHook {
  encrypt(data: Uint8Array, keyId: string): Promise<Result<Uint8Array, BackupError>>;
  decrypt(data: Uint8Array, keyId: string): Promise<Result<Uint8Array, BackupError>>;
}

/**
 * No-op pass-through hook used when no encryption key is configured.
 * In production replace with an AES-GCM or KMS-backed implementation.
 */
export class NoOpEncryptionHook implements EncryptionHook {
  async encrypt(data: Uint8Array, _keyId: string): Promise<Result<Uint8Array, BackupError>> {
    return ok(data);
  }

  async decrypt(data: Uint8Array, _keyId: string): Promise<Result<Uint8Array, BackupError>> {
    return ok(data);
  }
}

/**
 * Simple XOR-based stub for development only — NOT cryptographically secure.
 * Demonstrates the hook interface shape; replace with real crypto in production.
 */
export class DevXorEncryptionHook implements EncryptionHook {
  constructor(private readonly secretByte = 0x5a) {}

  async encrypt(data: Uint8Array, _keyId: string): Promise<Result<Uint8Array, BackupError>> {
    const out = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) out[i] = (data[i] ?? 0) ^ this.secretByte;
    return ok(out);
  }

  async decrypt(data: Uint8Array, keyId: string): Promise<Result<Uint8Array, BackupError>> {
    // XOR is symmetric — same operation.
    return this.encrypt(data, keyId);
  }
}

/** Registry mapping keyId prefixes to hook implementations. */
export class EncryptionRegistry {
  private readonly hooks = new Map<string, EncryptionHook>();
  private readonly fallback: EncryptionHook;

  constructor(fallback: EncryptionHook = new NoOpEncryptionHook()) {
    this.fallback = fallback;
  }

  register(keyIdPrefix: string, hook: EncryptionHook): void {
    this.hooks.set(keyIdPrefix, hook);
  }

  resolve(keyId: string): EncryptionHook {
    for (const [prefix, hook] of this.hooks) {
      if (keyId.startsWith(prefix)) return hook;
    }
    return this.fallback;
  }

  async encrypt(data: Uint8Array, keyId: string): Promise<Result<Uint8Array, BackupError>> {
    return this.resolve(keyId).encrypt(data, keyId);
  }

  async decrypt(data: Uint8Array, keyId: string): Promise<Result<Uint8Array, BackupError>> {
    return this.resolve(keyId).decrypt(data, keyId);
  }
}
