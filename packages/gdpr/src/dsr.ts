// Data Subject Request (DSR) core types and factory functions.
import { z } from "zod";
import { newId, type UserId, type IsoTimestamp, asIsoTimestamp } from "@veritas/core";

export const DSR_TYPES = ["ACCESS", "ERASURE", "PORTABILITY", "RECTIFICATION", "RESTRICTION", "OBJECTION"] as const;
export type DsrType = typeof DSR_TYPES[number];

export const DSR_STATUSES = ["PENDING", "VERIFYING", "IN_PROGRESS", "COMPLETED", "REJECTED", "FAILED"] as const;
export type DsrStatus = typeof DSR_STATUSES[number];

export const dsrTypeSchema = z.enum(DSR_TYPES);
export const dsrStatusSchema = z.enum(DSR_STATUSES);

export const dsrSchema = z.object({
  id: z.string(),
  type: dsrTypeSchema,
  status: dsrStatusSchema,
  subjectId: z.string(),
  subjectEmail: z.string().email(),
  requestedAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
  rejectionReason: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type Dsr = z.infer<typeof dsrSchema>;

export const createDsrSchema = z.object({
  type: dsrTypeSchema,
  subjectId: z.string().min(1),
  subjectEmail: z.string().email(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateDsr = z.infer<typeof createDsrSchema>;

export function makeDsr(input: CreateDsr): Dsr {
  const now = asIsoTimestamp(new Date().toISOString());
  return Object.freeze({
    id: newId("dsr"),
    type: input.type,
    status: "PENDING" as DsrStatus,
    subjectId: input.subjectId,
    subjectEmail: input.subjectEmail,
    requestedAt: now,
    updatedAt: now,
    notes: input.notes,
    metadata: input.metadata ? Object.freeze({ ...input.metadata }) : undefined,
  });
}

export function transitionDsr(dsr: Dsr, status: DsrStatus, extra?: Partial<Pick<Dsr, "rejectionReason" | "completedAt" | "notes">>): Dsr {
  const now = asIsoTimestamp(new Date().toISOString());
  return Object.freeze({
    ...dsr,
    status,
    updatedAt: now,
    ...(extra ?? {}),
  });
}
