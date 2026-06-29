// Affiliate store: in-memory repositories for affiliates, links, and commission records.

import { ok, err, type Result } from "@veritas/core";
import type { Affiliate } from "./affiliate.js";
import type { AffiliateLink } from "./link.js";
import type { Payout } from "./payout.js";
import {
  AffiliateNotFoundError,
  AffiliateLinkNotFoundError,
  AffiliatePayoutNotFoundError,
} from "./errors.js";

/** Repository interface for Affiliate entities. */
export interface AffiliateRepository {
  save(affiliate: Affiliate): Promise<Result<Affiliate>>;
  findById(id: string): Promise<Result<Affiliate>>;
  findByUserId(userId: string): Promise<readonly Affiliate[]>;
  findByReferralCode(code: string): Promise<Affiliate | undefined>;
  findAll(): Promise<readonly Affiliate[]>;
  delete(id: string): Promise<Result<void>>;
}

/** Repository interface for AffiliateLink entities. */
export interface AffiliateLinkRepository {
  save(link: AffiliateLink): Promise<Result<AffiliateLink>>;
  findById(id: string): Promise<Result<AffiliateLink>>;
  findByCode(code: string): Promise<AffiliateLink | undefined>;
  findByAffiliateId(affiliateId: string): Promise<readonly AffiliateLink[]>;
  delete(id: string): Promise<Result<void>>;
}

/** Repository interface for Payout entities. */
export interface PayoutRepository {
  save(payout: Payout): Promise<Result<Payout>>;
  findById(id: string): Promise<Result<Payout>>;
  findByAffiliateId(affiliateId: string): Promise<readonly Payout[]>;
  findByStatus(status: string): Promise<readonly Payout[]>;
  delete(id: string): Promise<Result<void>>;
}

/** In-memory implementation of AffiliateRepository. */
export class InMemoryAffiliateRepository implements AffiliateRepository {
  private readonly store = new Map<string, Affiliate>();

  async save(affiliate: Affiliate): Promise<Result<Affiliate>> {
    this.store.set(affiliate.id, affiliate);
    return ok(affiliate);
  }

  async findById(id: string): Promise<Result<Affiliate>> {
    const affiliate = this.store.get(id);
    if (affiliate === undefined) return err(new AffiliateNotFoundError(id));
    return ok(affiliate);
  }

  async findByUserId(userId: string): Promise<readonly Affiliate[]> {
    return [...this.store.values()].filter((a) => a.userId === userId);
  }

  async findByReferralCode(code: string): Promise<Affiliate | undefined> {
    return [...this.store.values()].find((a) => a.referralCode === code);
  }

  async findAll(): Promise<readonly Affiliate[]> {
    return [...this.store.values()];
  }

  async delete(id: string): Promise<Result<void>> {
    if (!this.store.has(id)) return err(new AffiliateNotFoundError(id));
    this.store.delete(id);
    return ok(undefined);
  }
}

/** In-memory implementation of AffiliateLinkRepository. */
export class InMemoryAffiliateLinkRepository implements AffiliateLinkRepository {
  private readonly store = new Map<string, AffiliateLink>();

  async save(link: AffiliateLink): Promise<Result<AffiliateLink>> {
    this.store.set(link.id, link);
    return ok(link);
  }

  async findById(id: string): Promise<Result<AffiliateLink>> {
    const link = this.store.get(id);
    if (link === undefined) return err(new AffiliateLinkNotFoundError(id));
    return ok(link);
  }

  async findByCode(code: string): Promise<AffiliateLink | undefined> {
    return [...this.store.values()].find((l) => l.code === code);
  }

  async findByAffiliateId(
    affiliateId: string
  ): Promise<readonly AffiliateLink[]> {
    return [...this.store.values()].filter(
      (l) => l.affiliateId === affiliateId
    );
  }

  async delete(id: string): Promise<Result<void>> {
    if (!this.store.has(id)) return err(new AffiliateLinkNotFoundError(id));
    this.store.delete(id);
    return ok(undefined);
  }
}

/** In-memory implementation of PayoutRepository. */
export class InMemoryPayoutRepository implements PayoutRepository {
  private readonly store = new Map<string, Payout>();

  async save(payout: Payout): Promise<Result<Payout>> {
    this.store.set(payout.id, payout);
    return ok(payout);
  }

  async findById(id: string): Promise<Result<Payout>> {
    const payout = this.store.get(id);
    if (payout === undefined) return err(new AffiliatePayoutNotFoundError(id));
    return ok(payout);
  }

  async findByAffiliateId(affiliateId: string): Promise<readonly Payout[]> {
    return [...this.store.values()].filter(
      (p) => p.affiliateId === affiliateId
    );
  }

  async findByStatus(status: string): Promise<readonly Payout[]> {
    return [...this.store.values()].filter((p) => p.status === status);
  }

  async delete(id: string): Promise<Result<void>> {
    if (!this.store.has(id)) return err(new AffiliatePayoutNotFoundError(id));
    this.store.delete(id);
    return ok(undefined);
  }
}
