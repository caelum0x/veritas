// service.ts: partner service — orchestrates lifecycle, agreements, access, quotas, and onboarding.

import { ok, err, type Result } from "@veritas/core";
import { type Partner, makePartner, applyPartnerUpdate, type CreatePartner, type UpdatePartner } from "./partner.js";
import { type PartnerTier, makePartnerTier, applyTierUpdate, type CreatePartnerTier, type UpdatePartnerTier } from "./tier.js";
import {
  type PartnerAgreement,
  makePartnerAgreement,
  signAgreement,
  terminateAgreement,
  isAgreementActive,
  type CreatePartnerAgreement,
  type SignAgreement,
  type TerminateAgreement,
} from "./agreement.js";
import {
  type ApiAccessGrant,
  makeApiAccessGrant,
  revokeApiAccessGrant,
  type CreateApiAccessGrant,
  type RevokeApiAccessGrant,
} from "./api-access.js";
import {
  type PartnerQuota,
  makePartnerQuota,
  incrementQuota,
  resetQuota,
  isQuotaExceeded,
  type CreatePartnerQuota,
  type QuotaIncrement,
} from "./quota.js";
import {
  type RevenueShare,
  makeRevenueShare,
  computeShare,
  type CreateRevenueShare,
} from "./revenue-share.js";
import {
  type PartnerOnboarding,
  makeOnboarding,
  advanceOnboardingStep,
  abandonOnboarding,
  type OnboardingStep,
} from "./onboarding.js";
import {
  type PartnerContact,
  makePartnerContact,
  applyContactUpdate,
  type CreatePartnerContact,
  type UpdatePartnerContact,
} from "./contact.js";
import { type PartnerStore } from "./store.js";
import { PartnerNotFoundError, PartnerAccessDeniedError, PartnerQuotaExceededError } from "./errors.js";

export class PartnerService {
  constructor(private readonly store: PartnerStore) {}

  // ---------------------------------------------------------------------------
  // Partners
  // ---------------------------------------------------------------------------

  async createPartner(input: CreatePartner, now: string): Promise<Result<Partner>> {
    const partner = makePartner(input, now);
    return this.store.savePartner(partner);
  }

  async getPartner(id: string): Promise<Result<Partner>> {
    const result = await this.store.getPartner(id);
    if (!result.ok) return err(result.error);
    if (!result.value) return err(PartnerNotFoundError.of("Partner", id));
    return ok(result.value);
  }

  async getPartnerBySlug(slug: string): Promise<Result<Partner>> {
    const result = await this.store.getPartnerBySlug(slug);
    if (!result.ok) return err(result.error);
    if (!result.value) return err(PartnerNotFoundError.of("Partner", slug));
    return ok(result.value);
  }

  async listPartners(): Promise<Result<readonly Partner[]>> {
    return this.store.listPartners();
  }

  async updatePartner(id: string, update: UpdatePartner, now: string): Promise<Result<Partner>> {
    const getResult = await this.store.getPartner(id);
    if (!getResult.ok) return err(getResult.error);
    if (!getResult.value) return err(PartnerNotFoundError.of("Partner", id));
    const updated = applyPartnerUpdate(getResult.value, update, now);
    return this.store.updatePartner(updated);
  }

  // ---------------------------------------------------------------------------
  // Tiers
  // ---------------------------------------------------------------------------

  async createTier(input: CreatePartnerTier, now: string): Promise<Result<PartnerTier>> {
    const tier = makePartnerTier(input, now);
    return this.store.saveTier(tier);
  }

  async getTier(id: string): Promise<Result<PartnerTier>> {
    const result = await this.store.getTier(id);
    if (!result.ok) return err(result.error);
    if (!result.value) return err(PartnerNotFoundError.of("PartnerTier", id));
    return ok(result.value);
  }

  async listTiers(): Promise<Result<readonly PartnerTier[]>> {
    return this.store.listTiers();
  }

  async updateTier(id: string, update: UpdatePartnerTier, now: string): Promise<Result<PartnerTier>> {
    const getResult = await this.store.getTier(id);
    if (!getResult.ok) return err(getResult.error);
    if (!getResult.value) return err(PartnerNotFoundError.of("PartnerTier", id));
    const updated = applyTierUpdate(getResult.value, update, now);
    return this.store.updateTier(updated);
  }

  // ---------------------------------------------------------------------------
  // Agreements
  // ---------------------------------------------------------------------------

  async createAgreement(input: CreatePartnerAgreement, now: string): Promise<Result<PartnerAgreement>> {
    const agreement = makePartnerAgreement(input, now);
    return this.store.saveAgreement(agreement);
  }

  async signPartnerAgreement(id: string, input: SignAgreement, now: string): Promise<Result<PartnerAgreement>> {
    const getResult = await this.store.getAgreement(id);
    if (!getResult.ok) return err(getResult.error);
    if (!getResult.value) return err(PartnerNotFoundError.of("PartnerAgreement", id));
    const signed = signAgreement(getResult.value, input, now);
    return this.store.updateAgreement(signed);
  }

  async terminatePartnerAgreement(id: string, input: TerminateAgreement, now: string): Promise<Result<PartnerAgreement>> {
    const getResult = await this.store.getAgreement(id);
    if (!getResult.ok) return err(getResult.error);
    if (!getResult.value) return err(PartnerNotFoundError.of("PartnerAgreement", id));
    const terminated = terminateAgreement(getResult.value, input, now);
    return this.store.updateAgreement(terminated);
  }

  async listPartnerAgreements(partnerId: string): Promise<Result<readonly PartnerAgreement[]>> {
    return this.store.findAgreementsByPartner(partnerId);
  }

  async hasActiveAgreement(partnerId: string, now: string): Promise<Result<boolean>> {
    const result = await this.store.findAgreementsByPartner(partnerId);
    if (!result.ok) return err(result.error);
    return ok(result.value.some((a) => isAgreementActive(a, now)));
  }

  // ---------------------------------------------------------------------------
  // API Access Grants
  // ---------------------------------------------------------------------------

  async createGrant(input: CreateApiAccessGrant, now: string): Promise<Result<ApiAccessGrant>> {
    const partnerResult = await this.store.getPartner(input.partnerId);
    if (!partnerResult.ok) return err(partnerResult.error);
    if (!partnerResult.value) return err(PartnerNotFoundError.of("Partner", input.partnerId));
    if (partnerResult.value.status !== "active") {
      return err(PartnerAccessDeniedError.of("Partner is not active"));
    }
    const grant = makeApiAccessGrant(input, now);
    return this.store.saveGrant(grant);
  }

  async revokeGrant(id: string, input: RevokeApiAccessGrant, now: string): Promise<Result<ApiAccessGrant>> {
    const getResult = await this.store.getGrant(id);
    if (!getResult.ok) return err(getResult.error);
    if (!getResult.value) return err(PartnerNotFoundError.of("ApiAccessGrant", id));
    const revoked = revokeApiAccessGrant(getResult.value, input, now);
    return this.store.updateGrant(revoked);
  }

  async listPartnerGrants(partnerId: string): Promise<Result<readonly ApiAccessGrant[]>> {
    return this.store.findGrantsByPartner(partnerId);
  }

  // ---------------------------------------------------------------------------
  // Quotas
  // ---------------------------------------------------------------------------

  async createQuota(input: CreatePartnerQuota, now: string): Promise<Result<PartnerQuota>> {
    const quota = makePartnerQuota(input, now);
    return this.store.saveQuota(quota);
  }

  async recordUsage(id: string, increment: QuotaIncrement): Promise<Result<PartnerQuota>> {
    const getResult = await this.store.getQuota(id);
    if (!getResult.ok) return err(getResult.error);
    if (!getResult.value) return err(PartnerNotFoundError.of("PartnerQuota", id));
    const quota = getResult.value;
    if (isQuotaExceeded(quota)) {
      return err(PartnerQuotaExceededError.of(quota.metric, quota.limit));
    }
    const updated = incrementQuota(quota, increment);
    return this.store.updateQuota(updated);
  }

  async resetQuotaWindow(
    id: string,
    newWindowStartsAt: string,
    newWindowEndsAt: string,
    now: string,
  ): Promise<Result<PartnerQuota>> {
    const getResult = await this.store.getQuota(id);
    if (!getResult.ok) return err(getResult.error);
    if (!getResult.value) return err(PartnerNotFoundError.of("PartnerQuota", id));
    const reset = resetQuota(getResult.value, newWindowStartsAt, newWindowEndsAt, now);
    return this.store.updateQuota(reset);
  }

  async listPartnerQuotas(partnerId: string): Promise<Result<readonly PartnerQuota[]>> {
    return this.store.findQuotasByPartner(partnerId);
  }

  // ---------------------------------------------------------------------------
  // Revenue Shares
  // ---------------------------------------------------------------------------

  async createRevenueShare(input: CreateRevenueShare, now: string): Promise<Result<RevenueShare>> {
    const rs = makeRevenueShare(input, now);
    return this.store.saveRevenueShare(rs);
  }

  async computePartnerShare(revenueShareId: string, amountCents: number): Promise<Result<number>> {
    const getResult = await this.store.getRevenueShare(revenueShareId);
    if (!getResult.ok) return err(getResult.error);
    if (!getResult.value) return err(PartnerNotFoundError.of("RevenueShare", revenueShareId));
    return computeShare(getResult.value, amountCents);
  }

  async listPartnerRevenueShares(partnerId: string): Promise<Result<readonly RevenueShare[]>> {
    return this.store.findRevenueSharesByPartner(partnerId);
  }

  // ---------------------------------------------------------------------------
  // Onboarding
  // ---------------------------------------------------------------------------

  async startOnboarding(partnerId: string, now: string): Promise<Result<PartnerOnboarding>> {
    const existing = await this.store.getOnboardingByPartner(partnerId);
    if (!existing.ok) return err(existing.error);
    if (existing.value && existing.value.status === "in_progress") {
      return ok(existing.value);
    }
    const onboarding = makeOnboarding(partnerId, now);
    return this.store.saveOnboarding(onboarding);
  }

  async advanceStep(
    onboardingId: string,
    step: OnboardingStep,
    now: string,
    notes?: string,
  ): Promise<Result<PartnerOnboarding>> {
    const getResult = await this.store.getOnboarding(onboardingId);
    if (!getResult.ok) return err(getResult.error);
    if (!getResult.value) return err(PartnerNotFoundError.of("PartnerOnboarding", onboardingId));
    const advanced = advanceOnboardingStep(getResult.value, step, now, notes);
    if (!advanced.ok) return err(advanced.error);
    return this.store.updateOnboarding(advanced.value);
  }

  async abandonPartnerOnboarding(onboardingId: string, now: string): Promise<Result<PartnerOnboarding>> {
    const getResult = await this.store.getOnboarding(onboardingId);
    if (!getResult.ok) return err(getResult.error);
    if (!getResult.value) return err(PartnerNotFoundError.of("PartnerOnboarding", onboardingId));
    const abandoned = abandonOnboarding(getResult.value, now);
    if (!abandoned.ok) return err(abandoned.error);
    return this.store.updateOnboarding(abandoned.value);
  }

  // ---------------------------------------------------------------------------
  // Contacts
  // ---------------------------------------------------------------------------

  async addContact(input: CreatePartnerContact, now: string): Promise<Result<PartnerContact>> {
    const contact = makePartnerContact(input, now);
    return this.store.saveContact(contact);
  }

  async updateContact(id: string, update: UpdatePartnerContact, now: string): Promise<Result<PartnerContact>> {
    const getResult = await this.store.getContact(id);
    if (!getResult.ok) return err(getResult.error);
    if (!getResult.value) return err(PartnerNotFoundError.of("PartnerContact", id));
    const updated = applyContactUpdate(getResult.value, update, now);
    return this.store.updateContact(updated);
  }

  async removeContact(id: string): Promise<Result<void>> {
    return this.store.removeContact(id);
  }

  async listPartnerContacts(partnerId: string): Promise<Result<readonly PartnerContact[]>> {
    return this.store.findContactsByPartner(partnerId);
  }
}
