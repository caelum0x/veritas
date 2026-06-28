// DID verification method types as defined in W3C DID Core spec.
import type { Did } from "./did.js";
import type { PublicKeyJwk, MultibaseKey } from "./types.js";

/** Supported verification method types. */
export type VerificationMethodType =
  | "JsonWebKey2020"
  | "Ed25519VerificationKey2020"
  | "EcdsaSecp256k1VerificationKey2019"
  | "X25519KeyAgreementKey2020"
  | "Multikey";

/** A DID verification method (public key representation). */
export interface VerificationMethod {
  readonly id: string;
  readonly type: VerificationMethodType | string;
  readonly controller: Did;
  readonly publicKeyJwk?: PublicKeyJwk;
  readonly publicKeyMultibase?: MultibaseKey;
  /** Legacy: raw hex-encoded public key. */
  readonly publicKeyHex?: string;
}

/** Build a JsonWebKey2020 verification method. */
export function makeJwkVerificationMethod(
  id: string,
  controller: Did,
  jwk: PublicKeyJwk,
): VerificationMethod {
  return Object.freeze({ id, type: "JsonWebKey2020", controller, publicKeyJwk: jwk });
}

/** Build an Ed25519VerificationKey2020 verification method with multibase key. */
export function makeEd25519VerificationMethod(
  id: string,
  controller: Did,
  publicKeyMultibase: MultibaseKey,
): VerificationMethod {
  return Object.freeze({
    id,
    type: "Ed25519VerificationKey2020",
    controller,
    publicKeyMultibase,
  });
}

/** Build a Multikey verification method. */
export function makeMultikeyVerificationMethod(
  id: string,
  controller: Did,
  publicKeyMultibase: MultibaseKey,
): VerificationMethod {
  return Object.freeze({ id, type: "Multikey", controller, publicKeyMultibase });
}

/** Extract the raw public key bytes from a verification method (best-effort). */
export function extractPublicKeyBytes(vm: VerificationMethod): Uint8Array | null {
  if (vm.publicKeyMultibase) {
    // Multibase: first char is encoding indicator; 'z' = base58btc
    const encoded = vm.publicKeyMultibase.slice(1);
    // Return null — full base58 decode requires external lib not available
    void encoded;
    return null;
  }
  if (vm.publicKeyHex) {
    return Buffer.from(vm.publicKeyHex, "hex");
  }
  return null;
}
