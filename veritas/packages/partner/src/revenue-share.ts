// revenue-share.ts: revenue share configuration and computation for partner organisations.

import { z } from "zod";
import { newId, type Id, ok, err, type Result } from "@veritas/core";
import { PartnerNotFoundError, PartnerConflictError } from "./errors.js";

export type RevenueShareId = Id<"revshare">;

export const RevenueShareModelSchema = z.enum(["percentage", "flat_fee", "tiered"]);
export type RevenueShareModel = z.infer<typeof RevenueShareModelSchema>;

export const TierBracketSchema = z.object({
  minAmount: z.number().nonnegative(),
  maxAmount: z.number().positive().nullable(),
  rate: z.number().min(0).max(1),
});
export type TierBracket = z.infer<typeof TierBracketSchema>;

export const RevenueShareSchema = z.object({
  id: z.string().startsWith("revshare_"),
  partnerId: z.string().startsWith("partner_"),
  model: RevenueShareModelSchema,
  rate: z.number().min(0).max(1).nullable(),
  flatFeeCents: z.number().int().nonnegative().nullable(),
  tiers: z.array(TierBracketSchema).nullable(),
  currency: z.string().length(3).default("USD"),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type RevenueShare = z.infer<typeof RevenueShareSchema>;

export const CreateRevenueShareSchema = z.object({
  partnerId: z.string().startsWith("partner_"),
  model: RevenueShareModelSchema,
  rate: z.number().min(0).max(1).optional(),
  flatFeeCents: z.number().int().nonnegative().optional(),
  tiers: z.array(TierBracketSchema).optional(),
  currency: z.string().length(3).optional(),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().nullable().optional(),
});
export type CreateRevenueShare = z.infer<typeof CreateRevenueShareSchema>;

export function makeRevenueShare(input: CreateRevenueShare, now: string): RevenueShare {
  return {
    id: newId("revshare") as string,
    partnerId: input.partnerId,
    model: input.model,
    rate: input.rate ?? null,
    flatFeeCents: input.flatFeeCents ?? null,
    tiers: input.tiers ?? null,
    currency: input.currency ?? "USD",
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export interface RevenueShareStore {
  save(rs: RevenueShare): Promise<Result<RevenueShare>>;
  findById(id: string): Promise<Result<RevenueShare | null>>;
  findByPartnerId(partnerId: string): Promise<Result<readonly RevenueShare[]>>;
  update(rs: RevenueShare): Promise<Result<RevenueShare>>;
}

/** Compute the partner's share of a given revenue amount in cents. */
export function computeShare(rs: RevenueShare, amountCents: number): Result<number> {
  if (rs.model === "percentage") {
    if (rs.rate === null) return err(new Error("percentage model requires rate"));
    return ok(Math.round(amountCents * rs.rate));
  }
  if (rs.model === "flat_fee") {
    if (rs.flatFeeCents === null) return err(new Error("flat_fee model requires flatFeeCents"));
    return ok(rs.flatFeeCents);
  }
  // tiered
  if (!rs.tiers || rs.tiers.length === 0) return err(new Error("tiered model requires tiers"));
  const bracket = rs.tiers.find(
    (t) => amountCents >= t.minAmount && (t.maxAmount === null || amountCents <= t.maxAmount),
  );
  if (!bracket) return err(new Error(`No tier bracket found for amount ${amountCents}`));
  return ok(Math.round(amountCents * bracket.rate));
}

export class InMemoryRevenueShareStore implements RevenueShareStore {
  private readonly records = new Map<string, RevenueShare>();

  async save(rs: RevenueShare): Promise<Result<RevenueShare>> {
    if (this.records.has(rs.id)) return err(PartnerConflictError.of("RevenueShare", rs.id));
    this.records.set(rs.id, rs);
    return ok(rs);
  }

  async findById(id: string): Promise<Result<RevenueShare | null>> {
    return ok(this.records.get(id) ?? null);
  }

  async findByPartnerId(partnerId: string): Promise<Result<readonly RevenueShare[]>> {
    return ok([...this.records.values()].filter((r) => r.partnerId === partnerId));
  }

  async update(rs: RevenueShare): Promise<Result<RevenueShare>> {
    if (!this.records.has(rs.id)) return err(PartnerNotFoundError.of("RevenueShare", rs.id));
    this.records.set(rs.id, rs);
    return ok(rs);
  }
}
