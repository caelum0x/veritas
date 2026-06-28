// Consent withdrawal: records a user revoking previously granted consent.
import { z } from "zod";
import { newId, IsoTimestamp } from "@veritas/core";
import { type Consent } from "./consent.js";

export type WithdrawalId = string & { readonly __brand: "WithdrawalId" };
export const newWithdrawalId = (): WithdrawalId => newId("withdrawal") as unknown as WithdrawalId;

export const WithdrawalReasonSchema = z.enum([
  "user_request",
  "account_deletion",
  "legal_requirement",
  "purpose_change",
  "other",
]);
export type WithdrawalReason = z.infer<typeof WithdrawalReasonSchema>;

export const WithdrawalSchema = z.object({
  id: z.string(),
  consentId: z.string(),
  userId: z.string(),
  purposeId: z.string(),
  reason: WithdrawalReasonSchema,
  notes: z.string().optional(),
  requestedAt: z.string(),
  effectiveAt: z.string(),
  acknowledgedAt: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export type Withdrawal = z.infer<typeof WithdrawalSchema>;

export const CreateWithdrawalSchema = z.object({
  consentId: z.string().min(1),
  userId: z.string().min(1),
  purposeId: z.string().min(1),
  reason: WithdrawalReasonSchema,
  notes: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export type CreateWithdrawal = z.infer<typeof CreateWithdrawalSchema>;

export function makeWithdrawal(
  input: CreateWithdrawal,
  now: IsoTimestamp
): Withdrawal {
  return {
    id: newWithdrawalId(),
    consentId: input.consentId,
    userId: input.userId,
    purposeId: input.purposeId,
    reason: input.reason,
    notes: input.notes,
    requestedAt: now,
    effectiveAt: now,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  };
}

export function applyWithdrawal(
  consent: Readonly<Consent>,
  withdrawnAt: IsoTimestamp
): Consent {
  return {
    ...consent,
    status: "withdrawn",
    withdrawnAt,
    updatedAt: withdrawnAt,
  };
}
