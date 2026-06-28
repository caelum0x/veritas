// Deterministic UID derivation for attestations (EAS-compatible via SHA-256)

import { createHash } from "node:crypto";
import type { ContentHash } from "@veritas/core";
import type { Brand } from "@veritas/core";

/** An attestation UID: 0x-prefixed 64-character hex string. */
export type AttestationUid = Brand<string, "AttestationUid">;

export interface UidInput {
  readonly schemaId: string;
  readonly attester: string;
  readonly recipient: string;
  readonly reportHash: ContentHash;
  readonly refUid?: AttestationUid;
  readonly time: number;
  readonly expirationTime: number;
  readonly revocable: boolean;
  readonly salt: string;
}

/** Derive a deterministic 32-byte UID by SHA-256 hashing the canonical fields. */
export function deriveUid(input: UidInput): AttestationUid {
  const raw = [
    input.schemaId,
    input.attester,
    input.recipient,
    input.reportHash,
    input.refUid ?? ZERO_UID,
    String(input.time),
    String(input.expirationTime),
    String(input.revocable),
    input.salt,
  ].join("|");

  const digest = createHash("sha256").update(raw).digest("hex");
  return `0x${digest}` as AttestationUid;
}

/** Check whether a string is a well-formed attestation UID. */
export function isAttestationUid(value: unknown): value is AttestationUid {
  return typeof value === "string" && /^0x[0-9a-f]{64}$/.test(value);
}

/** Zero UID sentinel used as "no reference". */
export const ZERO_UID =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as AttestationUid;
