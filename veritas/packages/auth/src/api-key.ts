// ApiKey value object with prefix parsing and validation (prefix: veritas_sk_)
// Format: veritas_sk_<keyId>_<secret>

import { Result, ok, err } from "@veritas/core";

const API_KEY_PREFIX = "veritas_sk_";
const API_KEY_MIN_LENGTH = API_KEY_PREFIX.length + 32;

export interface ApiKey {
  readonly raw: string;
  readonly prefix: string;
  /** The key identifier portion (used to look up the key in the store). */
  readonly keyId: string;
  /** The secret portion (used to verify the key via HMAC). */
  readonly secret: string;
}

export function parseApiKey(raw: string): Result<ApiKey, string> {
  if (typeof raw !== "string") {
    return err("API key must be a string");
  }
  if (!raw.startsWith(API_KEY_PREFIX)) {
    return err(`API key must start with "${API_KEY_PREFIX}"`);
  }
  if (raw.length < API_KEY_MIN_LENGTH) {
    return err(`API key is too short (minimum ${API_KEY_MIN_LENGTH} characters)`);
  }
  const rest = raw.slice(API_KEY_PREFIX.length);
  if (!/^[A-Za-z0-9_-]+$/.test(rest)) {
    return err("API key secret portion contains invalid characters");
  }
  // Format: <keyId>_<secret> — keyId is everything up to the first underscore.
  const underscoreIdx = rest.indexOf("_");
  if (underscoreIdx === -1) {
    return err("API key is missing key ID separator");
  }
  const keyId = rest.slice(0, underscoreIdx);
  const secret = rest.slice(underscoreIdx + 1);
  if (!keyId) {
    return err("API key ID portion is empty");
  }
  if (!secret) {
    return err("API key secret portion is empty");
  }
  return ok({ raw, prefix: API_KEY_PREFIX, keyId, secret });
}

export function generateApiKeyString(secretBytes: string): string {
  return `${API_KEY_PREFIX}${secretBytes}`;
}

export function isValidApiKeyFormat(raw: string): boolean {
  return parseApiKey(raw).ok === true;
}

export function maskApiKey(key: ApiKey): string {
  const visibleEnd = key.secret.slice(-4);
  return `${key.prefix}${"*".repeat(key.secret.length - 4)}${visibleEnd}`;
}
