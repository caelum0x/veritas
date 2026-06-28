// Optional ed25519-style signing stub interface for provenance attestations.

/**
 * A detached digital signature over an attestation payload.
 * The algorithm field describes the signing scheme (e.g. "ed25519").
 */
export interface ProvenanceSignature {
  /** Signing algorithm identifier, e.g. "ed25519". */
  readonly algorithm: string;
  /** Base64url-encoded public key of the signer. */
  readonly publicKey: string;
  /** Base64url-encoded raw signature bytes covering the canonical payload. */
  readonly signature: string;
  /** ISO timestamp at which the signature was produced. */
  readonly signedAt: string;
}

/**
 * A signer that can produce a ProvenanceSignature over any value.
 * Implementations must serialize the payload via canonical JSON before signing.
 */
export interface ProvenanceSigner {
  /**
   * Sign the given payload, returning a detached ProvenanceSignature.
   * The implementation is responsible for canonical serialization.
   */
  sign(payload: unknown): Promise<ProvenanceSignature>;
}

/**
 * A verifier that checks a ProvenanceSignature against a payload.
 */
export interface ProvenanceVerifier {
  /**
   * Verify that the signature was produced over the given payload.
   * Returns true when the signature is valid, false otherwise.
   */
  verify(payload: unknown, sig: ProvenanceSignature): Promise<boolean>;
}

/**
 * A no-op signer that always returns a sentinel "unsigned" signature.
 * Useful as a default when no signing key is configured.
 */
export const noopSigner: ProvenanceSigner = {
  async sign(_payload: unknown): Promise<ProvenanceSignature> {
    return {
      algorithm: "none",
      publicKey: "",
      signature: "",
      signedAt: new Date().toISOString(),
    };
  },
};

/**
 * A no-op verifier that always returns false (unsigned attestations cannot be trusted).
 */
export const noopVerifier: ProvenanceVerifier = {
  async verify(
    _payload: unknown,
    _sig: ProvenanceSignature,
  ): Promise<boolean> {
    return false;
  },
};
