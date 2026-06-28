// Campaign management: create, update, activate, pause, and end coupon campaigns.
import { type Result, ok, err, newId } from "@veritas/core";
import { type Campaign, type CampaignStatus } from "./types.js";
import { CampaignNotFoundError } from "./errors.js";

export interface CreateCampaignInput {
  readonly name: string;
  readonly description?: string;
  readonly startsAt?: string;
  readonly endsAt?: string;
}

export interface UpdateCampaignInput {
  readonly name?: string;
  readonly description?: string;
  readonly startsAt?: string;
  readonly endsAt?: string;
}

export function createCampaign(input: CreateCampaignInput, nowIso: string): Campaign {
  return {
    id: newId("campaign"),
    name: input.name,
    description: input.description,
    status: "draft",
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    couponIds: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function updateCampaign(
  campaign: Campaign,
  input: UpdateCampaignInput,
  nowIso: string,
): Campaign {
  return {
    ...campaign,
    name: input.name ?? campaign.name,
    description: input.description ?? campaign.description,
    startsAt: input.startsAt ?? campaign.startsAt,
    endsAt: input.endsAt ?? campaign.endsAt,
    updatedAt: nowIso,
  };
}

export function setCampaignStatus(
  campaign: Campaign,
  status: CampaignStatus,
  nowIso: string,
): Campaign {
  return { ...campaign, status, updatedAt: nowIso };
}

export function addCouponToCampaign(
  campaign: Campaign,
  couponId: string,
  nowIso: string,
): Campaign {
  if (campaign.couponIds.includes(couponId)) return campaign;
  return { ...campaign, couponIds: [...campaign.couponIds, couponId], updatedAt: nowIso };
}

export function removeCouponFromCampaign(
  campaign: Campaign,
  couponId: string,
  nowIso: string,
): Campaign {
  return {
    ...campaign,
    couponIds: campaign.couponIds.filter((id) => id !== couponId),
    updatedAt: nowIso,
  };
}

export function resolveCampaignStatus(campaign: Campaign, nowIso: string): CampaignStatus {
  if (campaign.status === "draft" || campaign.status === "paused") return campaign.status;
  if (campaign.endsAt !== undefined && nowIso > campaign.endsAt) return "ended";
  if (campaign.startsAt !== undefined && nowIso < campaign.startsAt) return "draft";
  return "active";
}
