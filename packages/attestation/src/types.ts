// Shared types for the @veritas/attestation package

import { z } from "zod";
import { contentHashSchema } from "@veritas/core";

/** Unique attestation identifier derived from schema + attester + data */
export type AttestationUid = string;

/** On-chain address of an attester */
export type AttesterAddress = string;

/** Schema identifier (EAS-like UID) */
export type SchemaUid = string;

export const AttestationStatusSchema = z.enum(["active", "revoked"]);
export type AttestationStatus = z.infer<typeof AttestationStatusSchema>;

export const AttestationRefSchema = z.object({
  uid: z.string(),
  txHash: z.string().optional(),
  blockNumber: z.bigint().optional(),
  chainId: z.number().int().positive(),
  timestamp: z.number().int().nonnegative(),
});
export type AttestationRef = z.infer<typeof AttestationRefSchema>;

export const BatchAnchorRefSchema = z.object({
  merkleRoot: contentHashSchema,
  txHash: z.string(),
  blockNumber: z.bigint().optional(),
  chainId: z.number().int().positive(),
  count: z.number().int().positive(),
  timestamp: z.number().int().nonnegative(),
});
export type BatchAnchorRef = z.infer<typeof BatchAnchorRefSchema>;

/** Options controlling how a report gets attested on-chain. */
export interface ReportAttestOptions {
  /** EVM chain ID to publish to. */
  readonly chainId: number;
  /** Whether the attestation can be revoked later. */
  readonly revocable?: boolean;
  /** Optional recipient address (defaults to zero address). */
  readonly recipient?: string;
  /** Optional expiration time as unix timestamp (0 = no expiration). */
  readonly expirationTime?: bigint;
}

/** Result returned after successfully attesting a report. */
export interface ReportAttestResult {
  readonly uid: string;
  readonly txHash: string;
  readonly blockNumber: bigint;
  readonly chainId: number;
  readonly attestedAt: number;
}
