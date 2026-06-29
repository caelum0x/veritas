// Ed25519 sign/verify wrapper implementing the Signer interface.
import { generateKeyPairSync, createSign, createVerify, type KeyObject } from "node:crypto";
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Signer, Bytes, Signature } from "./signer.js";

/** Ed25519 key pair with serialisation helpers. */
export interface Ed25519KeyPair {
  readonly keyId: string;
  readonly publicKey: KeyObject;
  readonly privateKey: KeyObject;
  /** DER-encoded public key bytes. */
  publicKeyDer(): Buffer;
}

/** Generates a new Ed25519 key pair and wraps it in an {@link Ed25519Signer}. */
export function generateEd25519KeyPair(keyId: string): Ed25519KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    keyId,
    publicKey,
    privateKey,
    publicKeyDer(): Buffer {
      return publicKey.export({ type: "spki", format: "der" }) as Buffer;
    },
  };
}

/** {@link Signer} implementation backed by a local Ed25519 private key. */
export class Ed25519Signer implements Signer {
  readonly algorithm = "Ed25519";
  readonly keyId: string;

  private readonly privateKey: KeyObject;
  private readonly publicKey: KeyObject;

  constructor(keyPair: Ed25519KeyPair) {
    this.keyId = keyPair.keyId;
    this.privateKey = keyPair.privateKey;
    this.publicKey = keyPair.publicKey;
  }

  async sign(message: Bytes): Promise<Result<Signature, Error>> {
    try {
      const signer = createSign("SHA512");
      signer.update(Buffer.from(message));
      const value = signer.sign({ key: this.privateKey, dsaEncoding: "ieee-p1363" });
      const signature: Signature = {
        algorithm: this.algorithm,
        keyId: this.keyId,
        value,
      };
      return ok(signature);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async verify(message: Bytes, signature: Bytes): Promise<Result<boolean, Error>> {
    try {
      const verifier = createVerify("SHA512");
      verifier.update(Buffer.from(message));
      const valid = verifier.verify(
        { key: this.publicKey, dsaEncoding: "ieee-p1363" },
        Buffer.from(signature)
      );
      return ok(valid);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}

/**
 * Verifies an Ed25519 signature using a raw DER-encoded public key buffer.
 * Returns a {@link Result} wrapping a boolean.
 */
export function verifyEd25519Raw(
  message: Bytes,
  signature: Bytes,
  publicKeyDer: Buffer
): Result<boolean, Error> {
  try {
    const verifier = createVerify("SHA512");
    verifier.update(Buffer.from(message));
    const valid = verifier.verify(
      { key: publicKeyDer, format: "der", type: "spki", dsaEncoding: "ieee-p1363" },
      Buffer.from(signature)
    );
    return ok(valid);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
