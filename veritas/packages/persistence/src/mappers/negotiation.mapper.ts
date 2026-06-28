// Mapper between Negotiation domain objects and persistence row representation.
import { epochToIso, isoToEpoch, newId, type IsoTimestamp } from "@veritas/core";
import type { Negotiation, CreateNegotiation } from "@veritas/contracts";

/** Raw persistence row for a Negotiation (stored as plain object). */
export interface NegotiationRow {
  readonly id: string;
  readonly serviceId: string;
  readonly buyerAgentId: string;
  readonly priceAmount: string;
  readonly priceCurrency: string;
  readonly status: string;
  readonly quoteHash: string;
  readonly expiresAt: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** Map a persistence row to a Negotiation domain object. */
export function rowToNegotiation(row: NegotiationRow): Negotiation {
  return {
    id: row.id as Negotiation["id"],
    serviceId: row.serviceId as Negotiation["serviceId"],
    buyerAgentId: row.buyerAgentId as Negotiation["buyerAgentId"],
    price: { amount: row.priceAmount, currency: row.priceCurrency as "USDC" },
    status: row.status as Negotiation["status"],
    quoteHash: row.quoteHash,
    expiresAt: row.expiresAt,
    createdAt: epochToIso(row.createdAt),
    updatedAt: epochToIso(row.updatedAt),
  };
}

/** Map a Negotiation domain object to a persistence row. */
export function negotiationToRow(negotiation: Negotiation): NegotiationRow {
  return {
    id: negotiation.id,
    serviceId: negotiation.serviceId,
    buyerAgentId: negotiation.buyerAgentId,
    priceAmount: negotiation.price.amount,
    priceCurrency: negotiation.price.currency,
    status: negotiation.status,
    quoteHash: negotiation.quoteHash,
    expiresAt: negotiation.expiresAt,
    createdAt: isoToEpoch(negotiation.createdAt) ?? 0,
    updatedAt: isoToEpoch(negotiation.updatedAt) ?? 0,
  };
}

/** Create a new Negotiation domain object from a CreateNegotiation DTO. */
export function createDtoToNegotiation(dto: CreateNegotiation, now: IsoTimestamp): Negotiation {
  const id = newId("neg") as Negotiation["id"];
  const quoteHash = [dto.serviceId, dto.buyerAgentId, dto.price.amount, dto.price.currency, now].join(":");
  return {
    id,
    serviceId: dto.serviceId as Negotiation["serviceId"],
    buyerAgentId: dto.buyerAgentId as Negotiation["buyerAgentId"],
    price: { amount: dto.price.amount, currency: dto.price.currency },
    status: "QUOTED",
    quoteHash,
    expiresAt: dto.expiresAt,
    createdAt: now,
    updatedAt: now,
  };
}
