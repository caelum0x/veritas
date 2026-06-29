// Verify agent identity: validate DID ownership and signature authenticity.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import { createVerify } from "node:crypto";
import type { Did } from "@veritas/did";
import type { AgentIdentity, AgentSigningKey } from "./types.js";
import type { IdentityError } from "./errors.js";
import { IdentityNotFoundError, ProofVerificationError } from "./errors.js";
import { getAgentIdentity } from "./agent-identity.js";

/** Input required to verify a signed message from an agent. */
export interface VerificationInput {
  readonly did: Did;
  readonly keyId: string;
  /** Original message bytes that were signed. */
  readonly message: Uint8Array | Buffer;
  /** Hex-encoded Ed25519 signature. */
  readonly signatureHex: string;
}

/** Result of a successful identity verification. */
export interface VerificationResult {
  readonly valid: boolean;
  readonly did: Did;
  readonly keyId: string;
  readonly identity: AgentIdentity;
}

/** Verify that a signature over a message was produced by the named key of the given DID. */
export async function verifyAgentSignature(
  input: VerificationInput,
): Promise<Result<VerificationResult, IdentityError>> {
  const identityResult = getAgentIdentity(input.did);
  if (!identityResult.ok) {
    return err(new IdentityNotFoundError(input.did));
  }

  const identity = identityResult.value;
  if (identity.deactivated) {
    return err(new ProofVerificationError(`Identity ${input.did} is deactivated`));
  }

  const key = identity.keys.find((k) => k.keyId === input.keyId);
  if (key === undefined) {
    return err(new ProofVerificationError(`Key ${input.keyId} not found for DID ${input.did}`));
  }

  if (key.revokedAt !== undefined) {
    return err(new ProofVerificationError(`Key ${input.keyId} has been revoked`));
  }

  const valid = verifyEd25519Signature(key, input.message, input.signatureHex);
  if (!valid.ok) return valid;

  return ok({ valid: valid.value, did: input.did, keyId: input.keyId, identity });
}

/** Verify an Ed25519 signature using the stored hex public key. */
function verifyEd25519Signature(
  key: AgentSigningKey,
  message: Uint8Array | Buffer,
  signatureHex: string,
): Result<boolean, IdentityError> {
  try {
    const publicKeyDer = Buffer.from(key.publicKeyHex, "hex");
    const signature = Buffer.from(signatureHex, "hex");
    const verifier = createVerify("SHA512");
    verifier.update(Buffer.from(message));
    const valid = verifier.verify(
      { key: publicKeyDer, format: "der", type: "spki", dsaEncoding: "ieee-p1363" },
      signature,
    );
    return ok(valid);
  } catch (e) {
    return err(
      new ProofVerificationError(
        `Signature verification threw: ${e instanceof Error ? e.message : String(e)}`,
      ),
    );
  }
}

/** Check whether an identity exists and is not deactivated. */
export function isIdentityActive(did: Did): Result<boolean, IdentityError> {
  const result = getAgentIdentity(did);
  if (!result.ok) return err(new IdentityNotFoundError(did));
  return ok(!result.value.deactivated);
}

/** Retrieve the current (non-revoked) key for a DID. */
export function resolveCurrentKey(did: Did): Result<AgentSigningKey, IdentityError> {
  const result = getAgentIdentity(did);
  if (!result.ok) return result;
  const key = result.value.keys.find((k) => k.isCurrent && k.revokedAt === undefined);
  if (key === undefined) {
    return err(new ProofVerificationError(`No active key found for DID: ${did}`));
  }
  return ok(key);
}
