// Challenge-response authentication: issue and verify time-limited challenges.
import { ok, err } from "@veritas/core";
import type { Result, IsoTimestamp } from "@veritas/core";
import { createVerify } from "node:crypto";
import { randomHex } from "@veritas/crypto";
import type { Did } from "@veritas/did";
import type { ProofOfControl } from "./types.js";
import { proofOfControlSchema } from "./types.js";
import type { IdentityError } from "./errors.js";
import { ChallengeError, ProofVerificationError } from "./errors.js";
import { getAgentIdentity } from "./agent-identity.js";

/** Default challenge TTL: 5 minutes. */
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/** Stored challenge with expiry. */
interface PendingChallenge {
  readonly challenge: string;
  readonly did: Did;
  readonly expiresAt: number;
}

/** In-memory map of challenge token -> pending challenge. */
const pendingChallenges = new Map<string, PendingChallenge>();

/** Issue a fresh challenge token for the given agent DID. */
export function issueChallenge(did: Did): Result<string, IdentityError> {
  const identityResult = getAgentIdentity(did);
  if (!identityResult.ok) return identityResult;

  if (identityResult.value.deactivated) {
    return err(new ChallengeError(`Identity ${did} is deactivated`));
  }

  const challenge = randomHex(32);
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  pendingChallenges.set(challenge, { challenge, did, expiresAt });

  // Evict expired challenges opportunistically.
  evictExpired();

  return ok(challenge);
}

/** Verify a ProofOfControl submitted in response to a challenge. */
export function verifyChallenge(
  proof: unknown,
): Result<ProofOfControl, IdentityError> {
  const parsed = proofOfControlSchema.safeParse(proof);
  if (!parsed.success) {
    return err(new ChallengeError(`Invalid proof payload: ${parsed.error.message}`));
  }
  const p = parsed.data as ProofOfControl;

  const pending = pendingChallenges.get(p.challenge);
  if (pending === undefined) {
    return err(new ChallengeError("Challenge not found or already consumed"));
  }

  if (Date.now() > pending.expiresAt) {
    pendingChallenges.delete(p.challenge);
    return err(new ChallengeError("Challenge has expired"));
  }

  if (pending.did !== p.did) {
    return err(new ChallengeError("Challenge DID mismatch"));
  }

  const identityResult = getAgentIdentity(p.did as Did);
  if (!identityResult.ok) return identityResult;

  const key = identityResult.value.keys.find((k) => k.keyId === p.keyId);
  if (key === undefined) {
    return err(new ProofVerificationError(`Key ${p.keyId} not found`));
  }
  if (key.revokedAt !== undefined) {
    return err(new ProofVerificationError(`Key ${p.keyId} has been revoked`));
  }

  const sigValid = verifyChallengeSignature(p.challenge, key.publicKeyHex, p.signatureB64);
  if (!sigValid.ok) return sigValid;
  if (!sigValid.value) {
    return err(new ProofVerificationError("Signature does not match challenge"));
  }

  // Consume the challenge (one-time use).
  pendingChallenges.delete(p.challenge);

  return ok(p);
}

/** Build a ProofOfControl object for signing (client-side helper). */
export function buildProofPayload(
  challenge: string,
  did: Did,
  keyId: string,
  signatureB64: string,
): ProofOfControl {
  return Object.freeze({
    challenge,
    did,
    keyId,
    signatureB64,
    issuedAt: new Date().toISOString() as IsoTimestamp,
  });
}

/** Verify Ed25519 signature of a challenge string encoded as base64url. */
function verifyChallengeSignature(
  challenge: string,
  publicKeyHex: string,
  signatureB64: string,
): Result<boolean, IdentityError> {
  try {
    const publicKeyDer = Buffer.from(publicKeyHex, "hex");
    const signature = Buffer.from(signatureB64, "base64");
    const verifier = createVerify("SHA512");
    verifier.update(Buffer.from(challenge, "utf8"));
    const valid = verifier.verify(
      { key: publicKeyDer, format: "der", type: "spki", dsaEncoding: "ieee-p1363" },
      signature,
    );
    return ok(valid);
  } catch (e) {
    return err(
      new ProofVerificationError(
        `Challenge signature error: ${e instanceof Error ? e.message : String(e)}`,
      ),
    );
  }
}

/** Remove all expired challenge tokens from the in-memory map. */
function evictExpired(): void {
  const now = Date.now();
  for (const [token, pending] of pendingChallenges) {
    if (now > pending.expiresAt) {
      pendingChallenges.delete(token);
    }
  }
}

/** Return the number of currently pending (non-expired) challenges. */
export function pendingChallengeCount(): number {
  evictExpired();
  return pendingChallenges.size;
}
