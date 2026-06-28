// Affiliate links: referral URL generation and validation.

import { Id, newId, IsoTimestamp, epochToIso } from "@veritas/core";
import { z } from "zod";
import type { AffiliateId } from "./affiliate.js";

export type AffiliateLinkId = Id<"alink">;

export const AffiliateLinkSchema = z.object({
  id: z.string(),
  affiliateId: z.string(),
  code: z.string().min(4).max(64),
  targetPath: z.string().min(1),
  utmSource: z.string().nullable(),
  utmMedium: z.string().nullable(),
  utmCampaign: z.string().nullable(),
  clickCount: z.number().int().nonnegative(),
  conversionCount: z.number().int().nonnegative(),
  isActive: z.boolean(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AffiliateLink = z.infer<typeof AffiliateLinkSchema>;

export const CreateAffiliateLinkSchema = z.object({
  affiliateId: z.string(),
  code: z.string().min(4).max(64),
  targetPath: z.string().min(1).default("/"),
  utmSource: z.string().nullable().default(null),
  utmMedium: z.string().nullable().default(null),
  utmCampaign: z.string().nullable().default(null),
  expiresAt: z.string().nullable().default(null),
});

export type CreateAffiliateLink = z.infer<typeof CreateAffiliateLinkSchema>;

export function createAffiliateLink(input: CreateAffiliateLink): AffiliateLink {
  const now: IsoTimestamp = epochToIso(Date.now());
  return {
    id: newId("alink") as unknown as string,
    affiliateId: input.affiliateId,
    code: input.code,
    targetPath: input.targetPath,
    utmSource: input.utmSource,
    utmMedium: input.utmMedium,
    utmCampaign: input.utmCampaign,
    clickCount: 0,
    conversionCount: 0,
    isActive: true,
    expiresAt: input.expiresAt,
    createdAt: now,
    updatedAt: now,
  };
}

export interface BuildUrlOptions {
  readonly baseUrl: string;
  readonly link: AffiliateLink;
}

export function buildReferralUrl(opts: BuildUrlOptions): string {
  const url = new URL(opts.link.targetPath, opts.baseUrl);
  url.searchParams.set("ref", opts.link.code);
  if (opts.link.utmSource !== null) url.searchParams.set("utm_source", opts.link.utmSource);
  if (opts.link.utmMedium !== null) url.searchParams.set("utm_medium", opts.link.utmMedium);
  if (opts.link.utmCampaign !== null) url.searchParams.set("utm_campaign", opts.link.utmCampaign);
  return url.toString();
}

export function isLinkExpired(link: AffiliateLink, now: IsoTimestamp): boolean {
  if (link.expiresAt === null) return false;
  return link.expiresAt <= now;
}

export function isLinkUsable(link: AffiliateLink, now: IsoTimestamp): boolean {
  return link.isActive && !isLinkExpired(link, now);
}

export function incrementClick(link: AffiliateLink): AffiliateLink {
  return {
    ...link,
    clickCount: link.clickCount + 1,
    updatedAt: epochToIso(Date.now()),
  };
}

export function incrementConversion(link: AffiliateLink): AffiliateLink {
  return {
    ...link,
    conversionCount: link.conversionCount + 1,
    updatedAt: epochToIso(Date.now()),
  };
}

export function deactivateLink(link: AffiliateLink): AffiliateLink {
  return {
    ...link,
    isActive: false,
    updatedAt: epochToIso(Date.now()),
  };
}

export function conversionRate(link: AffiliateLink): number {
  if (link.clickCount === 0) return 0;
  return link.conversionCount / link.clickCount;
}
