// Data key (DEK) generation: creates random 256-bit keys for per-record encryption.
import { randomBytes } from "node:crypto";
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import { dekId } from "./types.js";
import type { DataKey, KekId } from "./types.js";
import { EncryptionAtRestError } from "./errors.js";

/** Generate a new 32-byte random DEK associated with the given KEK id. */
export function generateDataKey(kekId: KekId): Result<DataKey, EncryptionAtRestError> {
  try {
    const id = dekId(`dek_${randomBytes(16).toString("hex")}`);
    const keyMaterial = randomBytes(32);
    const createdAt = Date.now();
    return ok({ id, keyMaterial, kekId, createdAt });
  } catch (e) {
    return err(new EncryptionAtRestError("Failed to generate data key", e));
  }
}

/** Derive a deterministic 32-byte sub-key from a DEK using HKDF-style mixing.
 *  Used to produce a distinct key per purpose (e.g., "searchable") from one DEK. */
export function deriveSubKey(
  dekMaterial: Buffer,
  purpose: string,
): Result<Buffer, EncryptionAtRestError> {
  try {
    const { createHmac } = require("node:crypto") as typeof import("node:crypto");
    const hmac = createHmac("sha256", dekMaterial);
    hmac.update(purpose);
    return ok(hmac.digest());
  } catch (e) {
    return err(new EncryptionAtRestError("Failed to derive sub-key", e));
  }
}

/** Zero-out key material in a mutable Buffer (best-effort; JS GC is non-deterministic). */
export function zeroize(keyMaterial: Buffer): void {
  keyMaterial.fill(0);
}
