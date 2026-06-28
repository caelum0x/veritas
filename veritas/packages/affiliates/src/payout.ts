// Affiliate payouts: models payout requests, approvals, and settlement records.

import { Id, newId, IsoTimestamp, epochToIso } from "@veritas/core";
import { z } from "zod";

export type PayoutId = Id<"payout">;

export const PayoutStatusSchema = z.enum([
  "pending",
  "approved",
  "processing",
  "paid",
  "failed",
  "cancelled",
]);
export type PayoutStatus = z.infer<typeof PayoutStatusSchema>;

export const PayoutMethodSchema = z.enum(["usdc_wallet", "bank_transfer", "paypal"]);
export type PayoutMethod = z.infer<typeof PayoutMethodSchema>;

export const PayoutSchema = z.object({
  id: z.string(),
  affiliateId: z.string(),
  /** Amount requested in USDC base units. */
  amountBaseUnits: z.bigint(),
  method: PayoutMethodSchema,
  /** Destination address or account identifier (opaque per method). */
  destination: z.string().min(1),
  status: PayoutStatusSchema,
  /** External transaction reference returned by payment rail. */
  externalRef: z.string().nullable(),
  failureReason: z.string().nullable(),
  requestedAt: z.string(),
  approvedAt: z.string().nullable(),
  paidAt: z.string().nullable(),
  updatedAt: z.string(),
  metadata: z.record(z.string()).default(() => ({})),
});

export type Payout = z.infer<typeof PayoutSchema>;

export const RequestPayoutSchema = z.object({
  affiliateId: z.string(),
  amountBaseUnits: z.bigint().positive(),
  method: PayoutMethodSchema,
  destination: z.string().min(1),
  metadata: z.record(z.string()).default(() => ({})),
});

export type RequestPayout = z.infer<typeof RequestPayoutSchema>;

/** Minimum payout threshold: 10 USDC in base units. */
export const MIN_PAYOUT_BASE_UNITS: bigint = 10_000_000n;

export function requestPayout(input: RequestPayout): Payout {
  if (input.amountBaseUnits < MIN_PAYOUT_BASE_UNITS) {
    throw new RangeError(
      `Payout amount ${input.amountBaseUnits} is below minimum ${MIN_PAYOUT_BASE_UNITS}`
    );
  }
  const now: IsoTimestamp = epochToIso(Date.now());
  return {
    id: newId("payout") as unknown as string,
    affiliateId: input.affiliateId,
    amountBaseUnits: input.amountBaseUnits,
    method: input.method,
    destination: input.destination,
    status: "pending",
    externalRef: null,
    failureReason: null,
    requestedAt: now,
    approvedAt: null,
    paidAt: null,
    updatedAt: now,
    metadata: input.metadata,
  };
}

export function approvePayout(payout: Payout): Payout {
  if (payout.status !== "pending") {
    throw new Error(`Cannot approve payout in status "${payout.status}"`);
  }
  const now: IsoTimestamp = epochToIso(Date.now());
  return { ...payout, status: "approved", approvedAt: now, updatedAt: now };
}

export function markProcessing(payout: Payout): Payout {
  if (payout.status !== "approved") {
    throw new Error(`Cannot mark processing for payout in status "${payout.status}"`);
  }
  return { ...payout, status: "processing", updatedAt: epochToIso(Date.now()) };
}

export function markPaid(payout: Payout, externalRef: string): Payout {
  if (payout.status !== "processing") {
    throw new Error(`Cannot mark paid for payout in status "${payout.status}"`);
  }
  const now: IsoTimestamp = epochToIso(Date.now());
  return {
    ...payout,
    status: "paid",
    externalRef,
    paidAt: now,
    updatedAt: now,
  };
}

export function markFailed(payout: Payout, reason: string): Payout {
  if (payout.status !== "processing" && payout.status !== "approved") {
    throw new Error(`Cannot mark failed for payout in status "${payout.status}"`);
  }
  return {
    ...payout,
    status: "failed",
    failureReason: reason,
    updatedAt: epochToIso(Date.now()),
  };
}

export function cancelPayout(payout: Payout): Payout {
  if (payout.status !== "pending" && payout.status !== "approved") {
    throw new Error(`Cannot cancel payout in status "${payout.status}"`);
  }
  return { ...payout, status: "cancelled", updatedAt: epochToIso(Date.now()) };
}

export function isTerminalStatus(status: PayoutStatus): boolean {
  return status === "paid" || status === "failed" || status === "cancelled";
}
