// did:key method resolver — derives DID Documents from self-describing public keys.
import { createHash } from "node:crypto";
import { ok, err, NotFoundError, UnavailableError } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { ParsedDid } from "../did.js";
import { asDid } from "../did.js";
import { makeDidDocument, DID_CONTEXT } from "../document.js";
import type { DidDocument } from "../document.js";
import type { VerificationMethod } from "../verification-method.js";
import { makeEd25519VerificationMethod, makeMultikeyVerificationMethod } from "../verification-method.js";
import type { DidMethodResolver, DidResolutionResult, ResolutionOptions } from "../resolver.js";
import type { MultibaseKey } from "../types.js";
import { asMultibaseKey } from "../types.js";

/** Multicodec varint prefix for ed25519 public key (0xed01 as varint). */
const ED25519_PUB_MULTICODEC = new Uint8Array([0xed, 0x01]);

/** Base58btc alphabet for encoding (used by did:key multibase 'z' prefix). */
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Encode bytes to base58btc. */
function encodeBase58(input: Uint8Array): string {
  const digits: number[] = [0];
  for (const byte of input) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i]! * 256;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let result = "";
  for (let i = input.length - 1; i >= 0 && input[i] === 0; i--) {
    result += "1";
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i]!];
  }
  return result;
}

/** Decode base58btc string to bytes. */
function decodeBase58(input: string): Uint8Array {
  const bytes = [0];
  for (const char of input) {
    const value = BASE58_ALPHABET.indexOf(char);
    if (value < 0) throw new Error(`Invalid base58 character: ${char}`);
    let carry = value;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i]! * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = input.length - 1; i >= 0 && input[i] === "1"; i--) {
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}

/** Encode a did:key multibase key identifier from raw key bytes + multicodec prefix. */
function toMultibaseKey(multicodecPrefix: Uint8Array, keyBytes: Uint8Array): MultibaseKey {
  const combined = new Uint8Array(multicodecPrefix.length + keyBytes.length);
  combined.set(multicodecPrefix);
  combined.set(keyBytes, multicodecPrefix.length);
  return asMultibaseKey(`z${encodeBase58(combined)}`);
}

/** Derive a minimal Ed25519 DID Document from a did:key identifier. */
function deriveEd25519Document(
  did: string,
  multibaseKey: MultibaseKey,
): Result<DidDocument, UnavailableError> {
  try {
    const parsedDid = asDid(did);
    const vmId = `${did}#${multibaseKey}`;

    const verificationMethod: VerificationMethod = makeEd25519VerificationMethod(
      vmId,
      parsedDid,
      multibaseKey,
    );

    const doc = makeDidDocument(parsedDid, {
      verificationMethod: [verificationMethod],
      authentication: [vmId],
      assertionMethod: [vmId],
      capabilityInvocation: [vmId],
      capabilityDelegation: [vmId],
    });

    return ok(doc);
  } catch (e) {
    return err(
      new UnavailableError({
        message: `Failed to derive did:key document: ${e instanceof Error ? e.message : String(e)}`,
      }),
    );
  }
}

/** Generate a new did:key DID from a raw Ed25519 public key (32 bytes). */
export function didKeyFromEd25519PublicKey(publicKeyBytes: Uint8Array): string {
  const multibaseKey = toMultibaseKey(ED25519_PUB_MULTICODEC, publicKeyBytes);
  return `did:key:${multibaseKey}`;
}

/** did:key method resolver implementation. */
export class KeyMethodResolver implements DidMethodResolver {
  readonly method = "key";

  async resolve(
    parsed: ParsedDid,
    _options: ResolutionOptions,
  ): Promise<Result<DidResolutionResult, NotFoundError | UnavailableError>> {
    const { methodSpecificId } = parsed;

    // did:key method-specific-id is the multibase-encoded key
    if (!methodSpecificId.startsWith("z")) {
      return err(
        new UnavailableError({
          message: `did:key only supports base58btc ('z') multibase encoding, got: ${methodSpecificId[0]}`,
        }),
      );
    }

    const multibaseKey = asMultibaseKey(methodSpecificId);
    const did = `did:key:${methodSpecificId}`;

    // Decode multicodec prefix to determine key type
    let rawBytes: Uint8Array;
    try {
      rawBytes = decodeBase58(methodSpecificId.slice(1));
    } catch (e) {
      return err(
        new UnavailableError({ message: `Invalid base58btc encoding in did:key: ${methodSpecificId}` }),
      );
    }

    // Check multicodec prefix
    if (rawBytes[0] !== 0xed || rawBytes[1] !== 0x01) {
      return err(
        new UnavailableError({
          message: `Unsupported key type multicodec prefix: 0x${rawBytes[0]?.toString(16)}${rawBytes[1]?.toString(16)}`,
        }),
      );
    }

    const docResult = deriveEd25519Document(did, multibaseKey);
    if (!docResult.ok) return docResult;

    const result: DidResolutionResult = {
      didDocument: docResult.value,
      didResolutionMetadata: { contentType: "application/did+ld+json" },
      didDocumentMetadata: {},
    };

    return ok(result);
  }
}
