// Prove and verify that an agent controls a DID key via challenge-response signature.
import { ok, err, tryAsync } from "@veritas/core";
import type { Result, IsoTimestamp } from "@veritas/core";
import { epochToIso } from "@veritas/core";
import { createVerify } from "node:crypto";
import { ProofVerificationError } from "./errors.js";
import type { ProofOfControl, AgentSigningKey } from "./types.js";

/** Options for verifying a proof of control. */
export interface VerifyProofOptions {
  /** Maximum allowed age of the proof in milliseconds (default: 5 minutes). */
  readonly maxAgeMs?: number;
}

const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Build the canonical challenge message that must be signed for proof-of-control.
 * Format: "veritas-poc:v1:<did>:<keyId>:<challenge>"
 */
export function buildProofMessage(did: string, keyId: string, challenge: string): Buffer {
  return Buffer.from(`veritas-poc:v1:${did}:${keyId}:${challenge}`, "utf8");
}

/**
 * Verify an Ed25519 proof-of-control against a known public key.
 * Returns ok(true) when the signature is valid and the proof is fresh.
 */
export async function verifyProofOfControl(
  proof: ProofOfControl,
  key: AgentSigningKey,
  opts: VerifyProofOptions = {},
): Promise<Result<true, ProofVerificationError>> {
  const maxAgeMs = opts.maxAgeMs ?? DEFAULT_MAX_AGE_MS;

  // Freshness check
  const issuedAtMs = new Date(proof.issuedAt).getTime();
  const nowMs = Date.now();
  if (Number.isNaN(issuedAtMs)) {
    return err(new ProofVerificationError("issuedAt is not a valid ISO timestamp"));
  }
  if (nowMs - issuedAtMs > maxAgeMs) {
    return err(new ProofVerificationError(`Proof is expired (age > ${maxAgeMs}ms)`));
  }
  if (issuedAtMs > nowMs + 30_000) {
    return err(new ProofVerificationError("Proof issuedAt is in the future"));
  }

  // Key must be current and match the proof's keyId
  if (key.keyId !== proof.keyId) {
    return err(new ProofVerificationError(`Key ID mismatch: expected ${key.keyId}`));
  }
  if (!key.isCurrent || key.revokedAt) {
    return err(new ProofVerificationError("Key is not current or has been revoked"));
  }
  if (key.algorithm !== "Ed25519") {
    return err(new ProofVerificationError(`Unsupported key algorithm: ${key.algorithm}`));
  }

  const message = buildProofMessage(proof.did, proof.keyId, proof.challenge);

  const result = await tryAsync(async () => {
    const pubKeyBytes = Buffer.from(key.publicKeyHex, "hex");
    const sigBytes = Buffer.from(proof.signatureB64, "base64url");

    // Node crypto Ed25519 verification via createVerify
    const verifier = createVerify("SHA512");
    verifier.update(message);
    const valid = verifier.verify(
      { key: pubKeyBytes, format: "der", type: "spki", dsaEncoding: "ieee-p1363" } as Parameters<typeof verifier.verify>[0],
      sigBytes,
    );
    return valid;
  });

  if (!result.ok) {
    return err(
      new ProofVerificationError(
        `Signature verification threw: ${result.error instanceof Error ? result.error.message : String(result.error)}`,
      ),
    );
  }

  if (!result.value) {
    return err(new ProofVerificationError("Signature is invalid"));
  }

  return ok(true);
}

/** Create a proof-of-control record (to be signed externally and returned). */
export function makeProofOfControl(
  did: string,
  keyId: string,
  challenge: string,
  signatureB64: string,
): ProofOfControl {
  return Object.freeze({
    challenge,
    did: did as ProofOfControl["did"],
    keyId,
    signatureB64,
    issuedAt: epochToIso(Date.now()) as IsoTimestamp,
  });
}
