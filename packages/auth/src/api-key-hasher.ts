// Hash and verify API keys using SHA-256 with a per-key salt

import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { Result, ok, err } from "@veritas/core";
import type { ApiKey } from "./api-key.js";

const SALT_BYTES = 16;
const SEPARATOR = ":";

export interface HashedApiKey {
  readonly hash: string;
  readonly salt: string;
}

export interface ApiKeyHasher {
  hash(key: ApiKey): HashedApiKey;
  verify(key: ApiKey, stored: HashedApiKey): boolean;
  serialize(hashed: HashedApiKey): string;
  deserialize(serialized: string): Result<HashedApiKey, string>;
}

function computeHash(secret: string, salt: string): string {
  return createHmac("sha256", salt).update(secret).digest("hex");
}

export function createApiKeyHasher(): ApiKeyHasher {
  return {
    hash(key: ApiKey): HashedApiKey {
      const salt = randomBytes(SALT_BYTES).toString("hex");
      const hash = computeHash(key.secret, salt);
      return { hash, salt };
    },

    verify(key: ApiKey, stored: HashedApiKey): boolean {
      const candidate = computeHash(key.secret, stored.salt);
      const candidateBuf = Buffer.from(candidate, "hex");
      const storedBuf = Buffer.from(stored.hash, "hex");
      if (candidateBuf.length !== storedBuf.length) return false;
      return timingSafeEqual(candidateBuf, storedBuf);
    },

    serialize(hashed: HashedApiKey): string {
      return `${hashed.salt}${SEPARATOR}${hashed.hash}`;
    },

    deserialize(serialized: string): Result<HashedApiKey, string> {
      const idx = serialized.indexOf(SEPARATOR);
      if (idx === -1) return err("Invalid serialized hash format: missing separator");
      const salt = serialized.slice(0, idx);
      const hash = serialized.slice(idx + 1);
      if (!salt || !hash) return err("Invalid serialized hash format: empty salt or hash");
      return ok({ salt, hash });
    },
  };
}

export function quickHashApiKey(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}
