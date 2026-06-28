// Control attestation: records a human assertion that a control was effective during a period.

import { z } from "zod";
import { type IsoTimestamp, isoTimestampSchema } from "@veritas/core";
import { type Control } from "./control.js";

export const AttestationStatusSchema = z.enum([
  "pending",
  "attested",
  "rejected",
  "expired",
]);
export type AttestationStatus = z.infer<typeof AttestationStatusSchema>;

export const AttestationScopeSchema = z.enum([
  "design_effectiveness",
  "operating_effectiveness",
  "both",
]);
export type AttestationScope = z.infer<typeof AttestationScopeSchema>;

export const AttestorSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  title: z.string().min(1),
});
export type Attestor = z.infer<typeof AttestorSchema>;

export const AttestationSchema = z.object({
  id: z.string().min(1),
  controlId: z.string().min(1),
  attestor: AttestorSchema,
  scope: AttestationScopeSchema,
  status: AttestationStatusSchema,
  periodStart: isoTimestampSchema,
  periodEnd: isoTimestampSchema,
  statement: z.string().min(1),
  exceptions: z.array(z.string()).default([]),
  evidenceIds: z.array(z.string()).default([]),
  attestedAt: isoTimestampSchema.nullable(),
  expiresAt: isoTimestampSchema.nullable(),
  rejectionReason: z.string().nullable().default(null),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});
export type Attestation = z.infer<typeof AttestationSchema>;

export const CreateAttestationSchema = AttestationSchema.omit({
  id: true,
  status: true,
  attestedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: AttestationStatusSchema.default("pending"),
  attestedAt: isoTimestampSchema.nullable().default(null),
});
export type CreateAttestation = z.infer<typeof CreateAttestationSchema>;

export const UpdateAttestationSchema = z.object({
  status: AttestationStatusSchema.optional(),
  statement: z.string().min(1).optional(),
  exceptions: z.array(z.string()).optional(),
  evidenceIds: z.array(z.string()).optional(),
  attestedAt: isoTimestampSchema.nullable().optional(),
  expiresAt: isoTimestampSchema.nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateAttestation = z.infer<typeof UpdateAttestationSchema>;

/** Return true when an attestation has been completed and not expired. */
export function isAttestationValid(
  attestation: Attestation,
  now: IsoTimestamp,
): boolean {
  if (attestation.status !== "attested") return false;
  if (attestation.expiresAt !== null && attestation.expiresAt <= now)
    return false;
  return true;
}

/** Derive a display label for an attestation given its related control. */
export function attestationLabel(
  attestation: Attestation,
  control: Control,
): string {
  return `${control.code} — ${attestation.scope} [${attestation.status}]`;
}

/** Produce an attested copy of a pending attestation. */
export function attest(
  attestation: Attestation,
  now: IsoTimestamp,
): Attestation {
  return {
    ...attestation,
    status: "attested",
    attestedAt: now,
    updatedAt: now,
  };
}

/** Produce a rejected copy of a pending attestation. */
export function rejectAttestation(
  attestation: Attestation,
  reason: string,
  now: IsoTimestamp,
): Attestation {
  return {
    ...attestation,
    status: "rejected",
    rejectionReason: reason,
    updatedAt: now,
  };
}
