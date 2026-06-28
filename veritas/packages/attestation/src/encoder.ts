// Encode attestation data as ABI-like hex payloads for on-chain submission.

import type { HexString } from "@veritas/blockchain";
import type { ContentHash } from "@veritas/core";

/** The fields packed into an on-chain attestation payload. */
export interface AttestationPayload {
  readonly schemaUid: HexString;
  readonly recipient: string;
  readonly expirationTime: bigint;
  readonly revocable: boolean;
  readonly refUid: HexString;
  readonly data: HexString;
}

const ZERO_UID = "0x0000000000000000000000000000000000000000000000000000000000000000" as HexString;

/** Encode a content hash string as a minimal hex data field. */
export function encodeContentHashData(contentHash: ContentHash): HexString {
  // Strip "sha256:" prefix if present, then pad/truncate to 32 bytes.
  const raw = contentHash.startsWith("sha256:")
    ? contentHash.slice(7)
    : contentHash;
  const cleaned = raw.replace(/[^0-9a-fA-F]/g, "").slice(0, 64).padEnd(64, "0");
  return `0x${cleaned}` as HexString;
}

/** Encode a UTF-8 string as a hex field (first 256 bytes). */
export function encodeStringData(value: string): HexString {
  const bytes = new TextEncoder().encode(value).slice(0, 256);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex.padEnd(512, "0")}` as HexString;
}

/** Build a complete attestation payload for EAS-style on-chain submission. */
export function buildAttestationPayload(options: {
  readonly schemaUid: HexString;
  readonly recipient: string;
  readonly contentHash: ContentHash;
  readonly revocable?: boolean;
  readonly expirationTime?: bigint;
}): AttestationPayload {
  return {
    schemaUid: options.schemaUid,
    recipient: options.recipient,
    expirationTime: options.expirationTime ?? 0n,
    revocable: options.revocable ?? true,
    refUid: ZERO_UID,
    data: encodeContentHashData(options.contentHash),
  };
}

/** Serialize an AttestationPayload to a single hex string for tx calldata. */
export function serializePayload(payload: AttestationPayload): HexString {
  const recipientHex = Buffer.from(
    payload.recipient.replace(/^0x/, "").padStart(64, "0"),
    "hex"
  ).toString("hex");

  const expHex = payload.expirationTime.toString(16).padStart(64, "0");
  const revHex = (payload.revocable ? 1n : 0n).toString(16).padStart(64, "0");
  const dataHex = payload.data.replace(/^0x/, "");
  const refHex = payload.refUid.replace(/^0x/, "");
  const schemaHex = payload.schemaUid.replace(/^0x/, "");

  return `0x${schemaHex}${recipientHex}${expHex}${revHex}${refHex}${dataHex}` as HexString;
}
