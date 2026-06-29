// Maps coupon domain types to HTTP response shapes for the growth-api.
import type { CouponView, CampaignView, RedemptionRecord } from "../../controllers/coupons.controller.js";

export interface CouponResponse {
  readonly id: string;
  readonly code: string;
  readonly description: string | undefined;
  readonly discount: CouponView["discount"];
  readonly rule: CouponView["rule"];
  readonly status: CouponView["status"];
  readonly campaignId: string | undefined;
  readonly totalRedemptions: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CampaignResponse {
  readonly id: string;
  readonly name: string;
  readonly description: string | undefined;
  readonly status: CampaignView["status"];
  readonly startsAt: string | undefined;
  readonly endsAt: string | undefined;
  readonly couponIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RedemptionResponse {
  readonly id: string;
  readonly couponId: string;
  readonly couponCode: string;
  readonly userId: string;
  readonly orgId: string | undefined;
  readonly orderId: string | undefined;
  readonly originalBaseUnits: string;
  readonly discountedBaseUnits: string;
  readonly savedBaseUnits: string;
  readonly redeemedAt: string;
  readonly metadata: Record<string, string> | undefined;
}

export function toCouponResponse(view: CouponView): CouponResponse {
  return {
    id: view.id,
    code: view.code,
    description: view.description,
    discount: view.discount,
    rule: view.rule,
    status: view.status,
    campaignId: view.campaignId,
    totalRedemptions: view.totalRedemptions,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
  };
}

export function toCampaignResponse(view: CampaignView): CampaignResponse {
  return {
    id: view.id,
    name: view.name,
    description: view.description,
    status: view.status,
    startsAt: view.startsAt,
    endsAt: view.endsAt,
    couponIds: view.couponIds,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
  };
}

export function toRedemptionResponse(record: RedemptionRecord): RedemptionResponse {
  return {
    id: record.id,
    couponId: record.couponId,
    couponCode: record.couponCode,
    userId: record.userId,
    orgId: record.orgId,
    orderId: record.orderId,
    originalBaseUnits: record.originalBaseUnits,
    discountedBaseUnits: record.discountedBaseUnits,
    savedBaseUnits: record.savedBaseUnits,
    redeemedAt: record.redeemedAt,
    metadata: record.metadata,
  };
}
