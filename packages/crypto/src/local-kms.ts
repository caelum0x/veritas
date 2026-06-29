// Local in-memory KMS implementation — suitable for development and testing.
import { randomBytes, generateKeyPairSync } from "node:crypto";
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { KmsPort, KmsError } from "./kms.js";
import type {
  SymmetricKey,
  AsymmetricKeyPair,
  SymmetricKeyId,
  AsymmetricKeyId,
  CreateSymmetricKeyOptions,
  CreateAsymmetricKeyOptions,
} from "./key.js";
import { symmetricKeyId, asymmetricKeyId } from "./key.js";
import { KeyNotFoundError, KeyRotationError, CryptoError } from "./errors.js";

/** Generates a UUID-like random key id string. */
function newKeyId(): string {
  return randomBytes(16).toString("hex");
}

/** Checks whether a key is expired at the current time. */
function isExpired(key: SymmetricKey | AsymmetricKeyPair): boolean {
  if (key.expiresAt === undefined) return false;
  return Date.now() > key.expiresAt;
}

/** Local in-memory KMS — stores keys in Maps; data is lost on process restart. */
export class LocalKms implements KmsPort {
  private readonly symmetricKeys = new Map<string, SymmetricKey>();
  private readonly keyPairs = new Map<string, AsymmetricKeyPair>();

  async createSymmetricKey(
    options: CreateSymmetricKeyOptions = {},
  ): Promise<Result<SymmetricKey, KmsError>> {
    const algorithm = options.algorithm ?? "aes-256-gcm";
    const keyMaterial = randomBytes(32);
    const createdAt = Date.now();
    const expiresAt = options.ttlMs !== undefined ? createdAt + options.ttlMs : undefined;
    const id = symmetricKeyId(newKeyId());
    const key: SymmetricKey = { id, algorithm, keyMaterial, createdAt, expiresAt, version: 1 };
    this.symmetricKeys.set(id, key);
    return ok(key);
  }

  async getSymmetricKey(id: SymmetricKeyId): Promise<Result<SymmetricKey, KmsError>> {
    const key = this.symmetricKeys.get(id);
    if (key === undefined) return err(new KeyNotFoundError(id));
    if (isExpired(key)) return err(new KeyNotFoundError(`${id} (expired)`));
    return ok(key);
  }

  async createKeyPair(
    options: CreateAsymmetricKeyOptions = {},
  ): Promise<Result<AsymmetricKeyPair, KmsError>> {
    const algorithm = options.algorithm ?? "ed25519";
    const { publicKey: pubObj, privateKey: privObj } = generateKeyPairSync("ed25519");
    const publicKey = pubObj.export({ type: "spki", format: "der" }) as Buffer;
    const privateKey = privObj.export({ type: "pkcs8", format: "der" }) as Buffer;
    const createdAt = Date.now();
    const expiresAt = options.ttlMs !== undefined ? createdAt + options.ttlMs : undefined;
    const id = asymmetricKeyId(newKeyId());
    const pair: AsymmetricKeyPair = { id, algorithm, publicKey, privateKey, createdAt, expiresAt, version: 1 };
    this.keyPairs.set(id, pair);
    return ok(pair);
  }

  async getKeyPair(id: AsymmetricKeyId): Promise<Result<AsymmetricKeyPair, KmsError>> {
    const pair = this.keyPairs.get(id);
    if (pair === undefined) return err(new KeyNotFoundError(id));
    if (isExpired(pair)) return err(new KeyNotFoundError(`${id} (expired)`));
    return ok(pair);
  }

  async rotateSymmetricKey(id: SymmetricKeyId): Promise<Result<SymmetricKey, KmsError>> {
    const existing = this.symmetricKeys.get(id);
    if (existing === undefined) return err(new KeyRotationError(`Key not found for rotation: ${id}`));
    const newKeyMaterial = randomBytes(32);
    const rotated: SymmetricKey = {
      ...existing,
      keyMaterial: newKeyMaterial,
      createdAt: Date.now(),
      expiresAt: existing.expiresAt,
      version: existing.version + 1,
    };
    this.symmetricKeys.set(id, rotated);
    return ok(rotated);
  }

  async rotateKeyPair(id: AsymmetricKeyId): Promise<Result<AsymmetricKeyPair, KmsError>> {
    const existing = this.keyPairs.get(id);
    if (existing === undefined) return err(new KeyRotationError(`Key pair not found for rotation: ${id}`));
    const { publicKey: pubObj, privateKey: privObj } = generateKeyPairSync("ed25519");
    const publicKey = pubObj.export({ type: "spki", format: "der" }) as Buffer;
    const privateKey = privObj.export({ type: "pkcs8", format: "der" }) as Buffer;
    const rotated: AsymmetricKeyPair = {
      ...existing,
      publicKey,
      privateKey,
      createdAt: Date.now(),
      version: existing.version + 1,
    };
    this.keyPairs.set(id, rotated);
    return ok(rotated);
  }

  async deleteKey(id: SymmetricKeyId | AsymmetricKeyId): Promise<Result<void, KmsError>> {
    const deletedSym = this.symmetricKeys.delete(id);
    const deletedAsym = this.keyPairs.delete(id);
    if (!deletedSym && !deletedAsym) return err(new KeyNotFoundError(id));
    return ok(undefined);
  }

  async listSymmetricKeys(): Promise<Result<readonly SymmetricKeyId[], KmsError>> {
    return ok(Array.from(this.symmetricKeys.keys()) as SymmetricKeyId[]);
  }

  async listKeyPairs(): Promise<Result<readonly AsymmetricKeyId[], KmsError>> {
    return ok(Array.from(this.keyPairs.keys()) as AsymmetricKeyId[]);
  }
}
