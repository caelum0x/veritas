// Deterministic (searchable) encryption: produces stable HMAC-based tokens for indexed lookup.
import { createHmac } from "node:crypto";
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { SearchToken, SearchableEncryptionOptions } from "./types.js";
import { asSearchToken } from "./types.js";
import { SearchableEncryptionError } from "./errors.js";

/** Number of bytes to take from the HMAC output for each token (truncated hex). */
const TOKEN_BYTES = 32;

/**
 * Derive a deterministic SearchToken for a plaintext value using HMAC-SHA256.
 * The token is safe to store in an index: it reveals nothing about the plaintext
 * other than equality (same plaintext + same pepper => same token).
 */
export function deriveSearchToken(
  plaintext: string,
  opts: SearchableEncryptionOptions,
): Result<SearchToken, SearchableEncryptionError> {
  if (!plaintext) {
    return err(new SearchableEncryptionError("Cannot derive search token for empty plaintext"));
  }
  if (!opts.pepper) {
    return err(new SearchableEncryptionError("Search token pepper must not be empty"));
  }
  try {
    const hmac = createHmac("sha256", opts.pepper);
    hmac.update(plaintext, "utf8");
    const digest = hmac.digest();
    const token = digest.subarray(0, TOKEN_BYTES).toString("hex");
    return ok(asSearchToken(token));
  } catch (e) {
    return err(new SearchableEncryptionError("HMAC computation failed", e));
  }
}

/**
 * Derive search tokens for multiple plaintext values.
 * Useful for multi-value fields (e.g., email aliases) stored in a single column.
 */
export function deriveSearchTokens(
  plaintexts: readonly string[],
  opts: SearchableEncryptionOptions,
): Result<readonly SearchToken[], SearchableEncryptionError> {
  const tokens: SearchToken[] = [];
  for (const pt of plaintexts) {
    const result = deriveSearchToken(pt, opts);
    if (!result.ok) return result;
    tokens.push(result.value);
  }
  return ok(tokens);
}

/**
 * Check whether a candidate plaintext matches a stored SearchToken.
 * Performs a constant-time comparison to prevent timing attacks.
 */
export function matchesSearchToken(
  plaintext: string,
  storedToken: SearchToken,
  opts: SearchableEncryptionOptions,
): Result<boolean, SearchableEncryptionError> {
  const derived = deriveSearchToken(plaintext, opts);
  if (!derived.ok) return derived;

  const a = Buffer.from(derived.value, "hex");
  const b = Buffer.from(storedToken, "hex");

  if (a.length !== b.length) return ok(false);

  // Constant-time equality via XOR accumulation.
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return ok(diff === 0);
}

/**
 * Normalize plaintext before tokenization (lowercase, trim) to ensure
 * case-insensitive search tokens are consistent.
 */
export function normalizeForSearch(plaintext: string): string {
  return plaintext.trim().toLowerCase();
}

/**
 * Convenience: normalize then derive a SearchToken.
 * Use for case-insensitive indexed fields such as email addresses.
 */
export function deriveNormalizedSearchToken(
  plaintext: string,
  opts: SearchableEncryptionOptions,
): Result<SearchToken, SearchableEncryptionError> {
  return deriveSearchToken(normalizeForSearch(plaintext), opts);
}
