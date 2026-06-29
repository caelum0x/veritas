// In-memory signing key store with optional expiry support.
import type { SigningKeyEntry, SignatureAlgorithm } from "./types.js";
import { UnknownKeyIdError } from "./errors.js";

export interface KeyStore {
  /** Retrieves a key by ID, throwing UnknownKeyIdError if absent or expired. */
  getKey(keyId: string): SigningKeyEntry;
  /** Adds or replaces a key entry. */
  addKey(entry: SigningKeyEntry): void;
  /** Removes a key entry. Returns true if the key existed. */
  removeKey(keyId: string): boolean;
  /** Returns all non-expired key entries. */
  listKeys(): readonly SigningKeyEntry[];
}

/** Creates an in-memory KeyStore. */
export function createKeyStore(initial: readonly SigningKeyEntry[] = []): KeyStore {
  const keys = new Map<string, SigningKeyEntry>(
    initial.map((entry) => [entry.keyId, entry])
  );

  function isExpired(entry: SigningKeyEntry): boolean {
    return entry.expiresAt !== undefined && Date.now() > entry.expiresAt;
  }

  return {
    getKey(keyId: string): SigningKeyEntry {
      const entry = keys.get(keyId);
      if (entry === undefined || isExpired(entry)) {
        throw new UnknownKeyIdError(keyId);
      }
      return entry;
    },

    addKey(entry: SigningKeyEntry): void {
      keys.set(entry.keyId, entry);
    },

    removeKey(keyId: string): boolean {
      return keys.delete(keyId);
    },

    listKeys(): readonly SigningKeyEntry[] {
      return Array.from(keys.values()).filter((e) => !isExpired(e));
    },
  };
}

/** Convenience factory for a single HMAC-SHA256 key entry. */
export function makeHmacKeyEntry(
  keyId: string,
  secret: string,
  options: { expiresAt?: number } = {}
): SigningKeyEntry {
  return {
    keyId,
    secret,
    algorithm: "hmac-sha256" as SignatureAlgorithm,
    createdAt: Date.now(),
    expiresAt: options.expiresAt,
  };
}
