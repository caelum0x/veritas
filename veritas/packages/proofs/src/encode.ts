// Encode and decode proof envelopes to/from hex or base64 for transport.
import { canonicalize } from "@veritas/core";
import type { AnyProofEnvelope, EncodedProof, ProofKind } from "./types.js";
import { ProofEncodingError } from "./errors.js";

/** Supported wire encodings. */
type WireEncoding = "hex" | "base64";

/**
 * Encode a proof envelope to a wire-safe string.
 * Canonical JSON is produced first, then converted to the requested encoding.
 */
export function encodeProof(
  envelope: AnyProofEnvelope,
  encoding: WireEncoding = "hex"
): EncodedProof {
  try {
    const json = canonicalize(envelope);
    const buf = Buffer.from(json, "utf8");
    const data = encoding === "hex" ? buf.toString("hex") : buf.toString("base64");
    return { encoding, data, proofId: envelope.id, kind: envelope.kind };
  } catch (e) {
    throw new ProofEncodingError(
      `Failed to encode proof ${envelope.id}: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

/**
 * Decode an EncodedProof back to an AnyProofEnvelope.
 * Throws ProofEncodingError if the data is malformed.
 */
export function decodeProof(encoded: EncodedProof): AnyProofEnvelope {
  try {
    const buf =
      encoded.encoding === "hex"
        ? Buffer.from(encoded.data, "hex")
        : Buffer.from(encoded.data, "base64");
    const json = buf.toString("utf8");
    const parsed: unknown = JSON.parse(json);

    if (!isProofEnvelope(parsed)) {
      throw new ProofEncodingError("Decoded object is not a valid proof envelope");
    }
    return parsed as AnyProofEnvelope;
  } catch (e) {
    if (e instanceof ProofEncodingError) throw e;
    throw new ProofEncodingError(
      `Failed to decode proof: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

/** Lightweight structural guard for AnyProofEnvelope. */
function isProofEnvelope(v: unknown): boolean {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj["id"] === "string" &&
    obj["version"] === 1 &&
    typeof obj["kind"] === "string" &&
    typeof obj["payload"] === "object" &&
    obj["payload"] !== null &&
    typeof obj["createdAt"] === "string"
  );
}

/**
 * Re-encode a proof from one encoding to another without losing fidelity.
 */
export function reencodeProof(encoded: EncodedProof, targetEncoding: WireEncoding): EncodedProof {
  const envelope = decodeProof(encoded);
  return encodeProof(envelope, targetEncoding);
}
