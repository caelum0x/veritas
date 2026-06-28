// Attestation record: binds a report content-hash to an attester address and schema on-chain

import { z } from "zod";
import { contentHashSchema } from "@veritas/core";
import { AttestationStatusSchema } from "./types.js";

/** Core attestation data payload */
export const AttestationDataSchema = z.object({
  reportId: z.string(),
  reportHash: contentHashSchema,
  verificationId: z.string(),
  trustScore: z.number().min(0).max(1),
  verdict: z.enum(["supported", "refuted", "unverifiable", "mixed"]),
  claimCount: z.number().int().nonnegative(),
  issuedAt: z.number().int().nonnegative(),
});
export type AttestationData = z.infer<typeof AttestationDataSchema>;

/** Full attestation record (EAS-like structure) */
export const AttestationSchema = z.object({
  uid: z.string(),
  schemaUid: z.string(),
  attester: z.string(),
  recipient: z.string().optional(),
  data: AttestationDataSchema,
  refUid: z.string().optional(),
  revocable: z.boolean(),
  status: AttestationStatusSchema,
  txHash: z.string().optional(),
  blockNumber: z.bigint().optional(),
  chainId: z.number().int().positive(),
  createdAt: z.number().int().nonnegative(),
  revokedAt: z.number().int().nonnegative().optional(),
});
export type Attestation = z.infer<typeof AttestationSchema>;

/** Input for creating a new attestation */
export const CreateAttestationSchema = AttestationSchema.omit({
  uid: true,
  status: true,
  txHash: true,
  blockNumber: true,
  createdAt: true,
  revokedAt: true,
});
export type CreateAttestation = z.infer<typeof CreateAttestationSchema>;
