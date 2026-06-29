// store.ts: in-memory partner store — persistence port for all partner domain aggregates.

import { ok, err, type Result } from "@veritas/core";
import { type Partner } from "./partner.js";
import { type PartnerTier } from "./tier.js";
import { type PartnerAgreement } from "./agreement.js";
import { type ApiAccessGrant } from "./api-access.js";
import { type PartnerQuota } from "./quota.js";
import { type RevenueShare } from "./revenue-share.js";
import { type PartnerOnboarding } from "./onboarding.js";
import { type PartnerContact } from "./contact.js";
import { PartnerNotFoundError, PartnerConflictError } from "./errors.js";

// ---------------------------------------------------------------------------
// Port interfaces
// ---------------------------------------------------------------------------

export interface PartnerStore {
  savePartner(partner: Partner): Promise<Result<Partner>>;
  getPartner(id: string): Promise<Result<Partner | null>>;
  getPartnerBySlug(slug: string): Promise<Result<Partner | null>>;
  listPartners(): Promise<Result<readonly Partner[]>>;
  updatePartner(partner: Partner): Promise<Result<Partner>>;

  saveTier(tier: PartnerTier): Promise<Result<PartnerTier>>;
  getTier(id: string): Promise<Result<PartnerTier | null>>;
  listTiers(): Promise<Result<readonly PartnerTier[]>>;
  updateTier(tier: PartnerTier): Promise<Result<PartnerTier>>;

  saveAgreement(agreement: PartnerAgreement): Promise<Result<PartnerAgreement>>;
  getAgreement(id: string): Promise<Result<PartnerAgreement | null>>;
  findAgreementsByPartner(partnerId: string): Promise<Result<readonly PartnerAgreement[]>>;
  updateAgreement(agreement: PartnerAgreement): Promise<Result<PartnerAgreement>>;

  saveGrant(grant: ApiAccessGrant): Promise<Result<ApiAccessGrant>>;
  getGrant(id: string): Promise<Result<ApiAccessGrant | null>>;
  findGrantsByPartner(partnerId: string): Promise<Result<readonly ApiAccessGrant[]>>;
  updateGrant(grant: ApiAccessGrant): Promise<Result<ApiAccessGrant>>;

  saveQuota(quota: PartnerQuota): Promise<Result<PartnerQuota>>;
  getQuota(id: string): Promise<Result<PartnerQuota | null>>;
  findQuotasByPartner(partnerId: string): Promise<Result<readonly PartnerQuota[]>>;
  updateQuota(quota: PartnerQuota): Promise<Result<PartnerQuota>>;

  saveRevenueShare(rs: RevenueShare): Promise<Result<RevenueShare>>;
  getRevenueShare(id: string): Promise<Result<RevenueShare | null>>;
  findRevenueSharesByPartner(partnerId: string): Promise<Result<readonly RevenueShare[]>>;
  updateRevenueShare(rs: RevenueShare): Promise<Result<RevenueShare>>;

  saveOnboarding(onboarding: PartnerOnboarding): Promise<Result<PartnerOnboarding>>;
  getOnboarding(id: string): Promise<Result<PartnerOnboarding | null>>;
  getOnboardingByPartner(partnerId: string): Promise<Result<PartnerOnboarding | null>>;
  updateOnboarding(onboarding: PartnerOnboarding): Promise<Result<PartnerOnboarding>>;

  saveContact(contact: PartnerContact): Promise<Result<PartnerContact>>;
  getContact(id: string): Promise<Result<PartnerContact | null>>;
  findContactsByPartner(partnerId: string): Promise<Result<readonly PartnerContact[]>>;
  updateContact(contact: PartnerContact): Promise<Result<PartnerContact>>;
  removeContact(id: string): Promise<Result<void>>;
}

// ---------------------------------------------------------------------------
// In-memory implementation
// ---------------------------------------------------------------------------

export class InMemoryPartnerStore implements PartnerStore {
  private readonly partners = new Map<string, Partner>();
  private readonly tiers = new Map<string, PartnerTier>();
  private readonly agreements = new Map<string, PartnerAgreement>();
  private readonly grants = new Map<string, ApiAccessGrant>();
  private readonly quotas = new Map<string, PartnerQuota>();
  private readonly revenueShares = new Map<string, RevenueShare>();
  private readonly onboardings = new Map<string, PartnerOnboarding>();
  private readonly contacts = new Map<string, PartnerContact>();

  // Partners
  async savePartner(partner: Partner): Promise<Result<Partner>> {
    if (this.partners.has(partner.id)) return err(PartnerConflictError.of("Partner", partner.id));
    this.partners.set(partner.id, partner);
    return ok(partner);
  }
  async getPartner(id: string): Promise<Result<Partner | null>> {
    return ok(this.partners.get(id) ?? null);
  }
  async getPartnerBySlug(slug: string): Promise<Result<Partner | null>> {
    return ok([...this.partners.values()].find((p) => p.slug === slug) ?? null);
  }
  async listPartners(): Promise<Result<readonly Partner[]>> {
    return ok([...this.partners.values()]);
  }
  async updatePartner(partner: Partner): Promise<Result<Partner>> {
    if (!this.partners.has(partner.id)) return err(PartnerNotFoundError.of("Partner", partner.id));
    this.partners.set(partner.id, partner);
    return ok(partner);
  }

  // Tiers
  async saveTier(tier: PartnerTier): Promise<Result<PartnerTier>> {
    if (this.tiers.has(tier.id)) return err(PartnerConflictError.of("PartnerTier", tier.id));
    this.tiers.set(tier.id, tier);
    return ok(tier);
  }
  async getTier(id: string): Promise<Result<PartnerTier | null>> {
    return ok(this.tiers.get(id) ?? null);
  }
  async listTiers(): Promise<Result<readonly PartnerTier[]>> {
    return ok([...this.tiers.values()]);
  }
  async updateTier(tier: PartnerTier): Promise<Result<PartnerTier>> {
    if (!this.tiers.has(tier.id)) return err(PartnerNotFoundError.of("PartnerTier", tier.id));
    this.tiers.set(tier.id, tier);
    return ok(tier);
  }

  // Agreements
  async saveAgreement(agreement: PartnerAgreement): Promise<Result<PartnerAgreement>> {
    if (this.agreements.has(agreement.id)) return err(PartnerConflictError.of("PartnerAgreement", agreement.id));
    this.agreements.set(agreement.id, agreement);
    return ok(agreement);
  }
  async getAgreement(id: string): Promise<Result<PartnerAgreement | null>> {
    return ok(this.agreements.get(id) ?? null);
  }
  async findAgreementsByPartner(partnerId: string): Promise<Result<readonly PartnerAgreement[]>> {
    return ok([...this.agreements.values()].filter((a) => a.partnerId === partnerId));
  }
  async updateAgreement(agreement: PartnerAgreement): Promise<Result<PartnerAgreement>> {
    if (!this.agreements.has(agreement.id)) return err(PartnerNotFoundError.of("PartnerAgreement", agreement.id));
    this.agreements.set(agreement.id, agreement);
    return ok(agreement);
  }

  // API Access Grants
  async saveGrant(grant: ApiAccessGrant): Promise<Result<ApiAccessGrant>> {
    if (this.grants.has(grant.id)) return err(PartnerConflictError.of("ApiAccessGrant", grant.id));
    this.grants.set(grant.id, grant);
    return ok(grant);
  }
  async getGrant(id: string): Promise<Result<ApiAccessGrant | null>> {
    return ok(this.grants.get(id) ?? null);
  }
  async findGrantsByPartner(partnerId: string): Promise<Result<readonly ApiAccessGrant[]>> {
    return ok([...this.grants.values()].filter((g) => g.partnerId === partnerId));
  }
  async updateGrant(grant: ApiAccessGrant): Promise<Result<ApiAccessGrant>> {
    if (!this.grants.has(grant.id)) return err(PartnerNotFoundError.of("ApiAccessGrant", grant.id));
    this.grants.set(grant.id, grant);
    return ok(grant);
  }

  // Quotas
  async saveQuota(quota: PartnerQuota): Promise<Result<PartnerQuota>> {
    if (this.quotas.has(quota.id)) return err(PartnerConflictError.of("PartnerQuota", quota.id));
    this.quotas.set(quota.id, quota);
    return ok(quota);
  }
  async getQuota(id: string): Promise<Result<PartnerQuota | null>> {
    return ok(this.quotas.get(id) ?? null);
  }
  async findQuotasByPartner(partnerId: string): Promise<Result<readonly PartnerQuota[]>> {
    return ok([...this.quotas.values()].filter((q) => q.partnerId === partnerId));
  }
  async updateQuota(quota: PartnerQuota): Promise<Result<PartnerQuota>> {
    if (!this.quotas.has(quota.id)) return err(PartnerNotFoundError.of("PartnerQuota", quota.id));
    this.quotas.set(quota.id, quota);
    return ok(quota);
  }

  // Revenue Shares
  async saveRevenueShare(rs: RevenueShare): Promise<Result<RevenueShare>> {
    if (this.revenueShares.has(rs.id)) return err(PartnerConflictError.of("RevenueShare", rs.id));
    this.revenueShares.set(rs.id, rs);
    return ok(rs);
  }
  async getRevenueShare(id: string): Promise<Result<RevenueShare | null>> {
    return ok(this.revenueShares.get(id) ?? null);
  }
  async findRevenueSharesByPartner(partnerId: string): Promise<Result<readonly RevenueShare[]>> {
    return ok([...this.revenueShares.values()].filter((r) => r.partnerId === partnerId));
  }
  async updateRevenueShare(rs: RevenueShare): Promise<Result<RevenueShare>> {
    if (!this.revenueShares.has(rs.id)) return err(PartnerNotFoundError.of("RevenueShare", rs.id));
    this.revenueShares.set(rs.id, rs);
    return ok(rs);
  }

  // Onboardings
  async saveOnboarding(onboarding: PartnerOnboarding): Promise<Result<PartnerOnboarding>> {
    if (this.onboardings.has(onboarding.id)) return err(PartnerConflictError.of("PartnerOnboarding", onboarding.id));
    this.onboardings.set(onboarding.id, onboarding);
    return ok(onboarding);
  }
  async getOnboarding(id: string): Promise<Result<PartnerOnboarding | null>> {
    return ok(this.onboardings.get(id) ?? null);
  }
  async getOnboardingByPartner(partnerId: string): Promise<Result<PartnerOnboarding | null>> {
    return ok([...this.onboardings.values()].find((o) => o.partnerId === partnerId) ?? null);
  }
  async updateOnboarding(onboarding: PartnerOnboarding): Promise<Result<PartnerOnboarding>> {
    if (!this.onboardings.has(onboarding.id)) return err(PartnerNotFoundError.of("PartnerOnboarding", onboarding.id));
    this.onboardings.set(onboarding.id, onboarding);
    return ok(onboarding);
  }

  // Contacts
  async saveContact(contact: PartnerContact): Promise<Result<PartnerContact>> {
    if (this.contacts.has(contact.id)) return err(PartnerConflictError.of("PartnerContact", contact.id));
    this.contacts.set(contact.id, contact);
    return ok(contact);
  }
  async getContact(id: string): Promise<Result<PartnerContact | null>> {
    return ok(this.contacts.get(id) ?? null);
  }
  async findContactsByPartner(partnerId: string): Promise<Result<readonly PartnerContact[]>> {
    return ok([...this.contacts.values()].filter((c) => c.partnerId === partnerId));
  }
  async updateContact(contact: PartnerContact): Promise<Result<PartnerContact>> {
    if (!this.contacts.has(contact.id)) return err(PartnerNotFoundError.of("PartnerContact", contact.id));
    this.contacts.set(contact.id, contact);
    return ok(contact);
  }
  async removeContact(id: string): Promise<Result<void>> {
    if (!this.contacts.has(id)) return err(PartnerNotFoundError.of("PartnerContact", id));
    this.contacts.delete(id);
    return ok(undefined);
  }
}
