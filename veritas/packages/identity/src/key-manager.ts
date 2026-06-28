// Manage signing keys for agent identities: create, revoke, and retrieve keys.
import { ok, err } from "@veritas/core";
import type { Result, IsoTimestamp } from "@veritas/core";
import type { Did } from "@veritas/did";
import {
  generateEd25519KeyPair,
  fingerprintHex,
} from "@veritas/crypto";
import type { AgentSigningKey } from "./types.js";
import type { IdentityError } from "./errors.js";
import { IdentityNotFoundError } from "./errors.js";
import { getAgentIdentity, addSigningKey } from "./agent-identity.js";

/** Result of creating a new signing key for an agent. */
export interface CreatedKey {
  readonly key: AgentSigningKey;
  /** Hex-encoded private key bytes (PKCS8-DER) — store securely. */
  readonly privateKeyHex: string;
}

/** Generate a fresh Ed25519 signing key and attach it to the agent DID. */
export async function createSigningKey(
  did: Did,
): Promise<Result<CreatedKey, IdentityError>> {
  const identityResult = getAgentIdentity(did);
  if (!identityResult.ok) return identityResult;

  const keyPair = generateEd25519KeyPair(`identity-key-${Date.now()}`);
  const publicKeyDer = keyPair.publicKeyDer();
  const keyId = fingerprintHex(new Uint8Array(publicKeyDer));
  const now = new Date().toISOString() as IsoTimestamp;

  const signingKey: AgentSigningKey = Object.freeze({
    keyId,
    algorithm: "Ed25519" as const,
    publicKeyHex: publicKeyDer.toString("hex"),
    createdAt: now,
    isCurrent: true,
  });

  const updated = addSigningKey(did, signingKey);
  if (!updated.ok) return updated;

  const privateKeyHex = keyPair.privateKey
    .export({ type: "pkcs8", format: "der" })
    .toString("hex");

  return ok({ key: signingKey, privateKeyHex });
}

/** Retrieve all signing keys (including revoked) for an agent DID. */
export function getSigningKeys(
  did: Did,
): Result<readonly AgentSigningKey[], IdentityError> {
  const identityResult = getAgentIdentity(did);
  if (!identityResult.ok) return identityResult;
  return ok(identityResult.value.keys);
}

/** Get the current active signing key for an agent DID. */
export function getCurrentKey(
  did: Did,
): Result<AgentSigningKey, IdentityError> {
  const identityResult = getAgentIdentity(did);
  if (!identityResult.ok) return identityResult;

  const current = identityResult.value.keys.find((k) => k.isCurrent && k.revokedAt === undefined);
  if (current === undefined) {
    return err(new IdentityNotFoundError(`No active signing key for DID: ${did}`));
  }
  return ok(current);
}

/** Get a specific signing key by keyId for a given agent DID. */
export function getKeyById(
  did: Did,
  keyId: string,
): Result<AgentSigningKey, IdentityError> {
  const identityResult = getAgentIdentity(did);
  if (!identityResult.ok) return identityResult;

  const key = identityResult.value.keys.find((k) => k.keyId === keyId);
  if (key === undefined) {
    return err(new IdentityNotFoundError(`Key ${keyId} not found for DID: ${did}`));
  }
  return ok(key);
}
