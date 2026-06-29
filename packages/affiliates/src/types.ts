// Shared domain types for the @veritas/affiliates module.

import { z } from "zod";
import { type Id, type IsoTimestamp, type Usdc } from "@veritas/core";

// ---------------------------------------------------------------------------
// Branded ID types
// ---------------------------------------------------------------------------

export type AffiliateId = Id<"Affiliate">;
export type LinkId = Id<"Link">;
export type CommissionId = Id<"Commission">;
export type PayoutId = Id<"Payout">;
export type ClickId = Id<"Click">;
export type StatementId = Id<"Statement">;

// ---------------------------------------------------------------------------
// Enums & literals
// ---------------------------------------------------------------------------

export const AffiliateStatus = z.enum(["pending", "active", "suspended", "terminated"]);
export type AffiliateStatus = z.infer<typeof AffiliateStatus>;

export const CommissionStatus = z.enum(["pending", "approved", "rejected", "paid"]);
export type CommissionStatus = z.infer<typeof CommissionStatus>;

export const PayoutStatus = z.enum(["pending", "processing", "completed", "failed"]);
export type PayoutStatus = z.infer<typeof PayoutStatus>;

export const AttributionModel = z.enum(["first_click", "last_click", "linear"]);
export type AttributionModel = z.infer<typeof AttributionModel>;

// ---------------------------------------------------------------------------
// Value objects
// ---------------------------------------------------------------------------

export interface CommissionRate {
  readonly basisPoints: number; // e.g. 1000 = 10%
}

export interface AttributionWindow {
  readonly days: number;
}

// ---------------------------------------------------------------------------
// Core domain entities
// ---------------------------------------------------------------------------

export interface Affiliate {
  readonly id: AffiliateId;
  readonly userId: string;
  readonly organizationId: string;
  readonly referralCode: string;
  readonly status: AffiliateStatus;
  readonly tierId: string;
  readonly totalEarned: Usdc;
  readonly totalPaid: Usdc;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface AffiliateLink {
  readonly id: LinkId;
  readonly affiliateId: AffiliateId;
  readonly targetUrl: string;
  readonly slug: string;
  readonly clicks: number;
  readonly conversions: number;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface CommissionTier {
  readonly id: string;
  readonly name: string;
  readonly minReferrals: number;
  readonly commissionRate: CommissionRate;
  readonly attributionWindowDays: number;
}

export interface Commission {
  readonly id: CommissionId;
  readonly affiliateId: AffiliateId;
  readonly orderId: string;
  readonly amount: Usdc;
  readonly rate: CommissionRate;
  readonly status: CommissionStatus;
  readonly earnedAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface Payout {
  readonly id: PayoutId;
  readonly affiliateId: AffiliateId;
  readonly amount: Usdc;
  readonly status: PayoutStatus;
  readonly commissionIds: readonly CommissionId[];
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface ClickEvent {
  readonly id: ClickId;
  readonly linkId: LinkId;
  readonly affiliateId: AffiliateId;
  readonly ipHash: string;
  readonly userAgent: string;
  readonly referrer: string;
  readonly clickedAt: IsoTimestamp;
}

export interface SaleEvent {
  readonly clickId: ClickId;
  readonly orderId: string;
  readonly amount: Usdc;
  readonly occurredAt: IsoTimestamp;
}

export interface EarningsStatement {
  readonly id: StatementId;
  readonly affiliateId: AffiliateId;
  readonly periodStart: IsoTimestamp;
  readonly periodEnd: IsoTimestamp;
  readonly commissions: readonly Commission[];
  readonly totalEarned: Usdc;
  readonly totalPaid: Usdc;
  readonly pendingBalance: Usdc;
  readonly generatedAt: IsoTimestamp;
}

// ---------------------------------------------------------------------------
// Zod schemas for external-boundary validation
// ---------------------------------------------------------------------------

export const CommissionRateSchema = z.object({
  basisPoints: z.number().int().min(0).max(10000),
});

export const AttributionWindowSchema = z.object({
  days: z.number().int().min(1).max(365),
});

export const CreateAffiliateSchema = z.object({
  userId: z.string().min(1),
  organizationId: z.string().min(1),
  referralCode: z.string().min(3).max(32),
  tierId: z.string().min(1),
});
export type CreateAffiliate = z.infer<typeof CreateAffiliateSchema>;

export const CreateLinkSchema = z.object({
  affiliateId: z.string().min(1),
  targetUrl: z.string().url(),
  slug: z.string().min(2).max(64),
});
export type CreateLink = z.infer<typeof CreateLinkSchema>;

export const CreatePayoutSchema = z.object({
  affiliateId: z.string().min(1),
  commissionIds: z.array(z.string().min(1)).min(1),
});
export type CreatePayout = z.infer<typeof CreatePayoutSchema>;
