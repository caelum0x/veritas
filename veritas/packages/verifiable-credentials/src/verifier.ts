// VC Verifier — validates structure, expiry, and cryptographic proof of credentials/presentations.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import { ValidationError, InternalError } from "@veritas/core";
import type { Verifier as CryptoVerifier } from "@veritas/crypto";
import type { DidResolver } from "@veritas/did";
import { allVerificationMethods } from "@veritas/did";
import type { VerifiableCredential } from "./credential.js";
import { isExpired, issuerDid, verifiableCredentialSchema } from "./credential.js";
import type { VerifiablePresentation } from "./presentation.js";
import { verifiablePresentationSchema, isChallengeExpired } from "./presentation.js";
import type { ProofService } from "./proof.js";
import { defaultProofService } from "./proof.js";
import type { PresentationChallenge } from "./presentation.js";

/** Result of a credential verification. */
export interface CredentialVerificationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/** Options for verifying a credential. */
export interface VerifyCredentialOptions {
  readonly checkExpiry?: boolean;
  readonly checkStatus?: boolean;
  readonly cryptoVerifier: CryptoVerifier;
}

/** Options for verifying a presentation. */
export interface VerifyPresentationOptions {
  readonly challenge: PresentationChallenge;
  readonly cryptoVerifier: CryptoVerifier;
  readonly checkCredentials?: boolean;
  readonly credentialVerifier?: CryptoVerifier;
}

/** Configuration for CredentialVerifier. */
export interface VerifierConfig {
  readonly proofService?: ProofService;
  readonly didResolver?: DidResolver;
}

/** Verifies Verifiable Credentials and Presentations. */
export class CredentialVerifier {
  private readonly proofService: ProofService;
  private readonly didResolver: DidResolver | undefined;

  constructor(config: VerifierConfig = {}) {
    this.proofService = config.proofService ?? defaultProofService;
    this.didResolver = config.didResolver;
  }

  /** Verify a VerifiableCredential's structure, expiry, and proof. */
  async verifyCredential(
    credential: VerifiableCredential,
    opts: VerifyCredentialOptions,
  ): Promise<Result<CredentialVerificationResult, ValidationError | InternalError>> {
    const errors: string[] = [];

    // Structural validation
    const parsed = verifiableCredentialSchema.safeParse(credential);
    if (!parsed.success) {
      const msgs = parsed.error.issues.map((i) => i.message);
      return ok({ valid: false, errors: msgs });
    }

    // Type check
    if (!credential.type.includes("VerifiableCredential")) {
      errors.push("Missing required type 'VerifiableCredential'");
    }

    // Expiry check
    if (opts.checkExpiry !== false && isExpired(credential)) {
      errors.push("Credential has expired");
    }

    // Proof presence
    if (!credential.proof) {
      errors.push("Credential has no proof");
      return ok({ valid: false, errors });
    }

    if (errors.length > 0) {
      return ok({ valid: false, errors });
    }

    // Cryptographic verification
    const proofResult = await this.proofService.verifyCredentialProof(
      credential,
      opts.cryptoVerifier,
    );
    if (!proofResult.ok) {
      return err(proofResult.error);
    }
    if (!proofResult.value) {
      errors.push("Proof signature verification failed");
    }

    return ok({ valid: errors.length === 0, errors });
  }

  /** Verify a VerifiablePresentation's structure, challenge, and proof. */
  async verifyPresentation(
    vp: VerifiablePresentation,
    opts: VerifyPresentationOptions,
  ): Promise<Result<CredentialVerificationResult, ValidationError | InternalError>> {
    const errors: string[] = [];

    // Structural validation
    const parsed = verifiablePresentationSchema.safeParse(vp);
    if (!parsed.success) {
      const msgs = parsed.error.issues.map((i) => i.message);
      return ok({ valid: false, errors: msgs });
    }

    // Type check
    if (!vp.type.includes("VerifiablePresentation")) {
      errors.push("Missing required type 'VerifiablePresentation'");
    }

    // Challenge expiry
    if (isChallengeExpired(opts.challenge)) {
      errors.push("Challenge has expired");
    }

    // Proof presence
    if (!vp.proof) {
      errors.push("Presentation has no proof");
      return ok({ valid: false, errors });
    }

    if (errors.length > 0) {
      return ok({ valid: false, errors });
    }

    // Verify presentation proof
    const proofResult = await this.proofService.verifyPresentationProof(
      vp,
      opts.cryptoVerifier,
      opts.challenge.challenge,
      opts.challenge.domain,
    );
    if (!proofResult.ok) {
      return err(proofResult.error);
    }
    if (!proofResult.value) {
      errors.push("Presentation proof signature verification failed");
    }

    // Optionally verify each nested credential
    if (opts.checkCredentials && vp.verifiableCredential && opts.credentialVerifier) {
      const credVerifier = opts.credentialVerifier;
      for (const vc of vp.verifiableCredential) {
        const vcResult = await this.verifyCredential(vc, {
          cryptoVerifier: credVerifier,
          checkExpiry: true,
        });
        if (!vcResult.ok) return err(vcResult.error);
        if (!vcResult.value.valid) {
          errors.push(...vcResult.value.errors.map((e) => `Nested VC ${vc.id}: ${e}`));
        }
      }
    }

    return ok({ valid: errors.length === 0, errors });
  }
}
