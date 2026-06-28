// Promo code registry: validate codes and resolve their discount.

import { z } from "zod";
import { type Result, ok, err } from "@veritas/core";
import { type Discount, percentageDiscount, flatDiscount } from "./discount.js";
import { InvalidPromoCodeError } from "./errors.js";

export const PromoCodeSchema = z.object({
  code: z.string().min(1),
  discount: z.object({
    kind: z.enum(["PERCENTAGE", "FLAT"]),
    value: z.string(),
    label: z.string().optional(),
  }),
  maxUses: z.number().int().positive().optional(),
  usedCount: z.number().int().min(0).default(0),
  expiresAt: z.string().datetime().optional(),
  active: z.boolean().default(true),
});
export type PromoCode = z.infer<typeof PromoCodeSchema>;

/** Port: look up a promo code record by its string code. */
export interface PromoCodeRepository {
  findByCode(code: string): Promise<PromoCode | undefined>;
  incrementUsage(code: string): Promise<void>;
}

/** In-memory implementation for testing and local dev. */
export class InMemoryPromoCodeRepository implements PromoCodeRepository {
  private readonly store: Map<string, PromoCode>;

  constructor(initial: readonly PromoCode[] = []) {
    this.store = new Map(initial.map((p) => [p.code, p]));
  }

  async findByCode(code: string): Promise<PromoCode | undefined> {
    return this.store.get(code);
  }

  async incrementUsage(code: string): Promise<void> {
    const entry = this.store.get(code);
    if (entry) {
      this.store.set(code, { ...entry, usedCount: entry.usedCount + 1 });
    }
  }

  /** Seed helper — returns new registry without mutating this one. */
  withPromo(promo: PromoCode): InMemoryPromoCodeRepository {
    return new InMemoryPromoCodeRepository([...this.store.values(), promo]);
  }
}

function isExpired(promo: PromoCode): boolean {
  if (!promo.expiresAt) return false;
  return new Date(promo.expiresAt) < new Date();
}

function isExhausted(promo: PromoCode): boolean {
  if (promo.maxUses === undefined) return false;
  return promo.usedCount >= promo.maxUses;
}

/**
 * Validate a promo code and return its Discount, or an error.
 * Does NOT increment usage — call repo.incrementUsage after order confirmed.
 */
export async function resolvePromoCode(
  code: string,
  repo: PromoCodeRepository,
): Promise<Result<Discount, InvalidPromoCodeError>> {
  const promo = await repo.findByCode(code);
  if (!promo || !promo.active || isExpired(promo) || isExhausted(promo)) {
    return err(new InvalidPromoCodeError(code));
  }

  const discount: Discount =
    promo.discount.kind === "PERCENTAGE"
      ? percentageDiscount(Number(promo.discount.value), promo.discount.label)
      : flatDiscount(BigInt(promo.discount.value), promo.discount.label);

  return ok(discount);
}
