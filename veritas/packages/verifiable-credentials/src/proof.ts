// Proof port interface and mock implementation for VC signing/verification.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import { InternalError, ValidationError } from "@veritas/core";
import { epochToIso } from "@veritas/core";
import type { Signer, Verifier } from "@veritas/crypto";
import { encode as b64encode, decode as b64decode } from "@veritas/crypto";
import type { VerifiableCredential, CredentialProof } from "./credential.js";
import type { VerifiablePresentation } from "./presentation.js";

/** The proof purpose for assertion (default VC issuance). */
export const PROOF_PURPOSE_ASSERTION = "assertionMethod" as const;
export const PROOF_PURPOSE_AUTH = "authentication" as const;

/** Port interface for creating and verifying VC proofs. */
export interface ProofService {
  /** Create a detached JWS proof for the given credential. */
  createCredentialProof(
    credential: VerifiableCredential,
    signer: Signer,
    verificationMethod: string,
    purpose?: string,
  ): Promise<Result<CredentialProof, InternalError>>;

  /** Verify a credential proof. */
  verifyCredentialProof(
    credential: VerifiableCredential,
    verifier: Verifier,
  ): Promise<Result<boolean, ValidationError | InternalError>>;

  /** Create a detached JWS proof for the given presentation. */
  createPresentationProof(
    vp: VerifiablePresentation,
    signer: Signer,
    verificationMethod: string,
    challenge: string,
    domain?: string,
  ): Promise<Result<CredentialProof, InternalError>>;

  /** Verify a presentation proof. */
  verifyPresentationProof(
    vp: VerifiablePresentation,
    verifier: Verifier,
    expectedChallenge: string,
    expectedDomain?: string,
  ): Promise<Result<boolean, ValidationError | InternalError>>;
}

/** Serialize document to bytes, stripping proof field for signing. */
function documentBytes(doc: object): Uint8Array {
  const { proof: _p, ...rest } = doc as Record<string, unknown>;
  const json = JSON.stringify(rest, Object.keys(rest).sort());
  return new TextEncoder().encode(json);
}

/** In-memory proof service using the Signer/Verifier port from @veritas/crypto. */
export class JwsProofService implements ProofService {
  async createCredentialProof(
    credential: VerifiableCredential,
    signer: Signer,
    verificationMethod: string,
    purpose: string = PROOF_PURPOSE_ASSERTION,
  ): Promise<Result<CredentialProof, InternalError>> {
    const created = epochToIso(Date.now());
    const message = documentBytes(credential);
    const signResult = await signer.sign(message);
    if (!signResult.ok) {
      return err(new InternalError({ message: "Failed to sign credential", cause: signResult.error }));
    }
    const sig = signResult.value;
    const headerB64 = b64encode(new TextEncoder().encode(JSON.stringify({ alg: sig.algorithm, b64: false, crit: ["b64"] })));
    const payloadB64 = ""; // detached payload
    const sigB64 = b64encode(new Uint8Array(sig.value));
    const jws = `${headerB64}.${payloadB64}.${sigB64}`;

    const proof: CredentialProof = Object.freeze({
      type: "JsonWebSignature2020",
      created,
      verificationMethod,
      proofPurpose: purpose,
      jws,
    });
    return ok(proof);
  }

  async verifyCredentialProof(
    credential: VerifiableCredential,
    verifier: Verifier,
  ): Promise<Result<boolean, ValidationError | InternalError>> {
    const proof = credential.proof;
    if (!proof?.jws) {
      return err(new ValidationError({ message: "Credential has no JWS proof" }));
    }
    const parts = proof.jws.split(".");
    if (parts.length !== 3) {
      return err(new ValidationError({ message: "Invalid JWS format" }));
    }
    const [, , sigB64] = parts as [string, string, string];
    const sigBytes = b64decode(sigB64);
    const message = documentBytes(credential);
    const result = await verifier.verify(message, sigBytes);
    if (!result.ok) {
      return err(new InternalError({ message: "Verification operation failed", cause: result.error }));
    }
    return ok(result.value);
  }

  async createPresentationProof(
    vp: VerifiablePresentation,
    signer: Signer,
    verificationMethod: string,
    challenge: string,
    domain?: string,
  ): Promise<Result<CredentialProof, InternalError>> {
    const created = epochToIso(Date.now());
    const docWithChallenge = { ...vp, challenge, ...(domain !== undefined && { domain }) };
    const message = documentBytes(docWithChallenge);
    const signResult = await signer.sign(message);
    if (!signResult.ok) {
      return err(new InternalError({ message: "Failed to sign presentation", cause: signResult.error }));
    }
    const sig = signResult.value;
    const headerB64 = b64encode(new TextEncoder().encode(JSON.stringify({ alg: sig.algorithm, b64: false, crit: ["b64"] })));
    const jws = `${headerB64}..${b64encode(new Uint8Array(sig.value))}`;

    const proof: CredentialProof = Object.freeze({
      type: "JsonWebSignature2020",
      created,
      verificationMethod,
      proofPurpose: PROOF_PURPOSE_AUTH,
      challenge,
      ...(domain !== undefined && { domain }),
      jws,
    });
    return ok(proof);
  }

  async verifyPresentationProof(
    vp: VerifiablePresentation,
    verifier: Verifier,
    expectedChallenge: string,
    expectedDomain?: string,
  ): Promise<Result<boolean, ValidationError | InternalError>> {
    const proof = vp.proof;
    if (!proof?.jws) {
      return err(new ValidationError({ message: "Presentation has no JWS proof" }));
    }
    const storedChallenge = proof["challenge"] as string | undefined;
    if (storedChallenge !== expectedChallenge) {
      return err(new ValidationError({ message: "Challenge mismatch" }));
    }
    if (expectedDomain !== undefined && proof["domain"] !== expectedDomain) {
      return err(new ValidationError({ message: "Domain mismatch" }));
    }
    const parts = proof.jws.split(".");
    if (parts.length !== 3) {
      return err(new ValidationError({ message: "Invalid JWS format" }));
    }
    const [, , sigB64] = parts as [string, string, string];
    const sigBytes = b64decode(sigB64);
    const docWithChallenge = {
      ...vp,
      challenge: expectedChallenge,
      ...(expectedDomain !== undefined && { domain: expectedDomain }),
    };
    const message = documentBytes(docWithChallenge);
    const result = await verifier.verify(message, sigBytes);
    if (!result.ok) {
      return err(new InternalError({ message: "Verification operation failed", cause: result.error }));
    }
    return ok(result.value);
  }
}

/** Default singleton proof service. */
export const defaultProofService: ProofService = new JwsProofService();
