// Key rotation: retire the current signing key and generate a replacement.
import { ok, err } from "@veritas/core";
import type { Result, IsoTimestamp } from "@veritas/core";
import type { Did } from "@veritas/did";
import { generateEd25519KeyPair, fingerprintHex } from "@veritas/crypto";
import type { AgentIdentity, AgentSigningKey, KeyRotationEvent } from "./types.js";
import type { IdentityError } from "./errors.js";
import { KeyRotationError } from "./errors.js";
import { getAgentIdentity, removeAgentIdentity, createAgentIdentity, addSigningKey } from "./agent-identity.js";

/** In-memory log of key rotation events. */
const rotationLog: KeyRotationEvent[] = [];

/** Rotate the active signing key for an agent: revoke old, create new. */
export async function rotateSigningKey(
  did: Did,
  reason?: string,
): Promise<Result<{ identity: AgentIdentity; newPrivateKeyHex: string }, IdentityError>> {
  const identityResult = getAgentIdentity(did);
  if (!identityResult.ok) return identityResult;

  const existing = identityResult.value;
  const oldKey = existing.keys.find((k) => k.isCurrent && k.revokedAt === undefined);
  if (oldKey === undefined) {
    return err(new KeyRotationError("No current key to rotate"));
  }

  const now = new Date().toISOString() as IsoTimestamp;
  const newKeyPair = generateEd25519KeyPair(`rotated-key-${Date.now()}`);
  const publicKeyDer = newKeyPair.publicKeyDer();
  const newKeyId = fingerprintHex(new Uint8Array(publicKeyDer));

  const revokedKey: AgentSigningKey = Object.freeze({ ...oldKey, isCurrent: false, revokedAt: now });
  const freshKey: AgentSigningKey = Object.freeze({
    keyId: newKeyId,
    algorithm: "Ed25519" as const,
    publicKeyHex: publicKeyDer.toString("hex"),
    createdAt: now,
    isCurrent: true,
  });

  const updatedKeys: readonly AgentSigningKey[] = Object.freeze(
    existing.keys.map((k) => (k.keyId === oldKey.keyId ? revokedKey : k)).concat(freshKey),
  );

  // Reconstruct the identity in the store with updated keys.
  removeAgentIdentity(did);

  const seed = updatedKeys[0];
  if (seed === undefined) {
    return err(new KeyRotationError("Key list became empty during rotation"));
  }

  const created = createAgentIdentity({ did, displayName: existing.displayName, initialKey: seed });
  if (!created.ok) {
    return err(new KeyRotationError(`Failed to recreate identity during rotation: ${created.error.message}`));
  }

  let final = created.value;
  for (let i = 1; i < updatedKeys.length; i++) {
    const addResult = addSigningKey(did, updatedKeys[i]!);
    if (!addResult.ok) {
      return err(new KeyRotationError(`Failed to add key during rotation: ${addResult.error.message}`));
    }
    final = addResult.value;
  }

  const event: KeyRotationEvent = Object.freeze({
    did,
    oldKeyId: oldKey.keyId,
    newKeyId,
    rotatedAt: now,
    reason,
  });
  rotationLog.push(event);

  const newPrivateKeyHex = newKeyPair.privateKey
    .export({ type: "pkcs8", format: "der" })
    .toString("hex");

  return ok({ identity: final, newPrivateKeyHex });
}

/** Return the full rotation event log for a given DID. */
export function getRotationLog(did: Did): readonly KeyRotationEvent[] {
  return rotationLog.filter((e) => e.did === did);
}

/** Return all rotation events across all DIDs. */
export function getAllRotationEvents(): readonly KeyRotationEvent[] {
  return [...rotationLog];
}
