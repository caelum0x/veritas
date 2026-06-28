// Affiliate entity: represents a partner enrolled in the referral program.

import { Id, newId, IsoTimestamp, epochToIso } from "@veritas/core";
import { z } from "zod";

export type AffiliateId = Id<"affiliate">;

export const AffiliateStatusSchema = z.enum(["pending", "active", "suspended", "terminated"]);
export type AffiliateStatus = z.infer<typeof AffiliateStatusSchema>;

export const AffiliateSchema = z.object({
  id: z.string(),
  userId: z.string(),
  organizationId: z.string().nullable(),
  email: z.string().email(),
  displayName: z.string().min(1).max(120),
  status: AffiliateStatusSchema,
  tierId: z.string(),
  referralCode: z.string().min(4).max(32),
  payoutEmail: z.string().email().nullable(),
  totalEarnedBaseUnits: z.bigint(),
  totalPaidBaseUnits: z.bigint(),
  createdAt: z.string(),
  updatedAt: z.string(),
  activatedAt: z.string().nullable(),
});

export type Affiliate = z.infer<typeof AffiliateSchema>;

export const CreateAffiliateSchema = z.object({
  userId: z.string(),
  organizationId: z.string().nullable().default(null),
  email: z.string().email(),
  displayName: z.string().min(1).max(120),
  tierId: z.string().default("standard"),
  referralCode: z.string().min(4).max(32),
  payoutEmail: z.string().email().nullable().default(null),
});

export type CreateAffiliate = z.infer<typeof CreateAffiliateSchema>;

export function createAffiliate(input: CreateAffiliate): Affiliate {
  const now: IsoTimestamp = epochToIso(Date.now());
  return {
    id: newId("affiliate") as unknown as string,
    userId: input.userId,
    organizationId: input.organizationId,
    email: input.email,
    displayName: input.displayName,
    status: "pending",
    tierId: input.tierId,
    referralCode: input.referralCode,
    payoutEmail: input.payoutEmail,
    totalEarnedBaseUnits: 0n,
    totalPaidBaseUnits: 0n,
    createdAt: now,
    updatedAt: now,
    activatedAt: null,
  };
}

export function activateAffiliate(affiliate: Affiliate): Affiliate {
  const now: IsoTimestamp = epochToIso(Date.now());
  return {
    ...affiliate,
    status: "active",
    activatedAt: affiliate.activatedAt ?? now,
    updatedAt: now,
  };
}

export function suspendAffiliate(affiliate: Affiliate): Affiliate {
  return {
    ...affiliate,
    status: "suspended",
    updatedAt: epochToIso(Date.now()),
  };
}

export function terminateAffiliate(affiliate: Affiliate): Affiliate {
  return {
    ...affiliate,
    status: "terminated",
    updatedAt: epochToIso(Date.now()),
  };
}

export function recordEarning(affiliate: Affiliate, baseUnits: bigint): Affiliate {
  if (baseUnits < 0n) throw new RangeError("Earning amount must be non-negative");
  return {
    ...affiliate,
    totalEarnedBaseUnits: affiliate.totalEarnedBaseUnits + baseUnits,
    updatedAt: epochToIso(Date.now()),
  };
}

export function recordPayout(affiliate: Affiliate, baseUnits: bigint): Affiliate {
  if (baseUnits < 0n) throw new RangeError("Payout amount must be non-negative");
  const unpaid = affiliate.totalEarnedBaseUnits - affiliate.totalPaidBaseUnits;
  if (baseUnits > unpaid) {
    throw new RangeError(`Payout ${baseUnits} exceeds unpaid balance ${unpaid}`);
  }
  return {
    ...affiliate,
    totalPaidBaseUnits: affiliate.totalPaidBaseUnits + baseUnits,
    updatedAt: epochToIso(Date.now()),
  };
}

export function unpaidBalance(affiliate: Affiliate): bigint {
  return affiliate.totalEarnedBaseUnits - affiliate.totalPaidBaseUnits;
}
