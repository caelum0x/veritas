// Click and sale tracking: records affiliate link interactions and conversion events.

import { ok, err, type Result, newId, epochToIso } from "@veritas/core";
import {
  AffiliateClickNotFoundError,
  AffiliateSaleNotFoundError,
} from "./errors.js";

/** A recorded click on an affiliate link. */
export interface AffiliateClick {
  readonly id: string;
  readonly linkId: string;
  readonly affiliateId: string;
  readonly visitorId: string;
  readonly ipAddress: string | undefined;
  readonly userAgent: string | undefined;
  readonly referrer: string | undefined;
  readonly clickedAt: string;
  readonly metadata: Record<string, string>;
}

/** A recorded conversion/sale attributed to an affiliate click. */
export interface AffiliateSale {
  readonly id: string;
  readonly clickId: string;
  readonly affiliateId: string;
  readonly orderId: string;
  readonly orderAmountBaseUnits: bigint;
  readonly commissionAmountBaseUnits: bigint;
  readonly currency: string;
  readonly convertedAt: string;
  readonly metadata: Record<string, string>;
}

/** Repository interface for affiliate clicks. */
export interface ClickRepository {
  save(click: AffiliateClick): Promise<Result<AffiliateClick>>;
  findById(id: string): Promise<Result<AffiliateClick>>;
  findByLinkId(linkId: string): Promise<readonly AffiliateClick[]>;
  findByAffiliateId(affiliateId: string): Promise<readonly AffiliateClick[]>;
  findByVisitorId(visitorId: string): Promise<readonly AffiliateClick[]>;
}

/** Repository interface for affiliate sales. */
export interface SaleRepository {
  save(sale: AffiliateSale): Promise<Result<AffiliateSale>>;
  findById(id: string): Promise<Result<AffiliateSale>>;
  findByClickId(clickId: string): Promise<readonly AffiliateSale[]>;
  findByAffiliateId(affiliateId: string): Promise<readonly AffiliateSale[]>;
  findByOrderId(orderId: string): Promise<readonly AffiliateSale[]>;
}

/** Input for recording a new click event. */
export interface RecordClickInput {
  readonly linkId: string;
  readonly affiliateId: string;
  readonly visitorId: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly referrer?: string;
  readonly metadata?: Record<string, string>;
}

/** Input for recording a new sale/conversion event. */
export interface RecordSaleInput {
  readonly clickId: string;
  readonly affiliateId: string;
  readonly orderId: string;
  readonly orderAmountBaseUnits: bigint;
  readonly commissionAmountBaseUnits: bigint;
  readonly currency: string;
  readonly metadata?: Record<string, string>;
}

/** Service that records and retrieves click and sale tracking events. */
export class TrackingService {
  constructor(
    private readonly clicks: ClickRepository,
    private readonly sales: SaleRepository
  ) {}

  async recordClick(
    input: RecordClickInput,
    nowIso?: string
  ): Promise<Result<AffiliateClick>> {
    const click: AffiliateClick = {
      id: newId("click"),
      linkId: input.linkId,
      affiliateId: input.affiliateId,
      visitorId: input.visitorId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      referrer: input.referrer,
      clickedAt: nowIso ?? epochToIso(Date.now()),
      metadata: input.metadata ?? {},
    };
    return this.clicks.save(click);
  }

  async recordSale(
    input: RecordSaleInput,
    nowIso?: string
  ): Promise<Result<AffiliateSale>> {
    const clickResult = await this.clicks.findById(input.clickId);
    if (!clickResult.ok) return err(clickResult.error);

    const sale: AffiliateSale = {
      id: newId("sale"),
      clickId: input.clickId,
      affiliateId: input.affiliateId,
      orderId: input.orderId,
      orderAmountBaseUnits: input.orderAmountBaseUnits,
      commissionAmountBaseUnits: input.commissionAmountBaseUnits,
      currency: input.currency,
      convertedAt: nowIso ?? epochToIso(Date.now()),
      metadata: input.metadata ?? {},
    };
    return this.sales.save(sale);
  }

  async getClick(id: string): Promise<Result<AffiliateClick>> {
    return this.clicks.findById(id);
  }

  async getSale(id: string): Promise<Result<AffiliateSale>> {
    return this.sales.findById(id);
  }

  async getClicksByAffiliate(
    affiliateId: string
  ): Promise<readonly AffiliateClick[]> {
    return this.clicks.findByAffiliateId(affiliateId);
  }

  async getSalesByAffiliate(
    affiliateId: string
  ): Promise<readonly AffiliateSale[]> {
    return this.sales.findByAffiliateId(affiliateId);
  }

  async getSalesByClick(clickId: string): Promise<readonly AffiliateSale[]> {
    return this.sales.findByClickId(clickId);
  }

  async getClicksByLink(linkId: string): Promise<readonly AffiliateClick[]> {
    return this.clicks.findByLinkId(linkId);
  }
}

/** In-memory implementation of ClickRepository for testing and development. */
export class InMemoryClickRepository implements ClickRepository {
  private readonly store = new Map<string, AffiliateClick>();

  async save(click: AffiliateClick): Promise<Result<AffiliateClick>> {
    this.store.set(click.id, click);
    return ok(click);
  }

  async findById(id: string): Promise<Result<AffiliateClick>> {
    const click = this.store.get(id);
    if (click === undefined) return err(new AffiliateClickNotFoundError(id));
    return ok(click);
  }

  async findByLinkId(linkId: string): Promise<readonly AffiliateClick[]> {
    return [...this.store.values()].filter((c) => c.linkId === linkId);
  }

  async findByAffiliateId(
    affiliateId: string
  ): Promise<readonly AffiliateClick[]> {
    return [...this.store.values()].filter(
      (c) => c.affiliateId === affiliateId
    );
  }

  async findByVisitorId(visitorId: string): Promise<readonly AffiliateClick[]> {
    return [...this.store.values()].filter((c) => c.visitorId === visitorId);
  }
}

/** In-memory implementation of SaleRepository for testing and development. */
export class InMemorySaleRepository implements SaleRepository {
  private readonly store = new Map<string, AffiliateSale>();

  async save(sale: AffiliateSale): Promise<Result<AffiliateSale>> {
    this.store.set(sale.id, sale);
    return ok(sale);
  }

  async findById(id: string): Promise<Result<AffiliateSale>> {
    const sale = this.store.get(id);
    if (sale === undefined) return err(new AffiliateSaleNotFoundError(id));
    return ok(sale);
  }

  async findByClickId(clickId: string): Promise<readonly AffiliateSale[]> {
    return [...this.store.values()].filter((s) => s.clickId === clickId);
  }

  async findByAffiliateId(
    affiliateId: string
  ): Promise<readonly AffiliateSale[]> {
    return [...this.store.values()].filter(
      (s) => s.affiliateId === affiliateId
    );
  }

  async findByOrderId(orderId: string): Promise<readonly AffiliateSale[]> {
    return [...this.store.values()].filter((s) => s.orderId === orderId);
  }
}
