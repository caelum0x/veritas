// Surcharge value object: additional fees applied on top of a base price.

import { z } from "zod";
import { Usdc } from "@veritas/core";
import { type PriceMoney, priceMoney } from "./types.js";
import { NegativePriceError } from "./errors.js";

export const SurchargeKindSchema = z.enum(["PERCENTAGE", "FLAT"]);
export type SurchargeKind = z.infer<typeof SurchargeKindSchema>;

export const SurchargeSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  kind: SurchargeKindSchema,
  /** Percentage: 0–100. Flat: USDC base units as string. */
  value: z.string(),
  /** If true, this surcharge is required and cannot be removed. */
  required: z.boolean().default(false),
});

export type Surcharge = z.infer<typeof SurchargeSchema>;

/** Create a percentage surcharge (0–100). */
export function percentageSurcharge(
  id: string,
  pct: number,
  label?: string,
  required = false,
): Surcharge {
  if (pct < 0 || pct > 100) throw new NegativePriceError(`${pct}%`);
  return { id, kind: "PERCENTAGE", value: String(pct), label, required };
}

/** Create a flat surcharge in USDC base units. */
export function flatSurcharge(
  id: string,
  baseUnits: bigint,
  label?: string,
  required = false,
): Surcharge {
  if (baseUnits < 0n) throw new NegativePriceError(String(baseUnits));
  return { id, kind: "FLAT", value: baseUnits.toString(), label, required };
}

/** Compute the surcharge amount for a given base price. */
export function computeSurchargeAmount(price: PriceMoney, surcharge: Surcharge): PriceMoney {
  if (surcharge.kind === "PERCENTAGE") {
    const pct = Number(surcharge.value);
    const scaledPct = BigInt(Math.trunc(pct * 100));
    const extra = (price.amount.baseUnits * scaledPct) / 10000n;
    return priceMoney(Usdc.fromBaseUnits(extra < 0n ? 0n : extra), price.currency);
  }
  return priceMoney(Usdc.fromBaseUnits(BigInt(surcharge.value)), price.currency);
}

/** Apply a single surcharge to a price, returning the total (base + surcharge). */
export function applySurcharge(price: PriceMoney, surcharge: Surcharge): PriceMoney {
  const extra = computeSurchargeAmount(price, surcharge);
  return priceMoney(price.amount.add(extra.amount), price.currency);
}

/** Apply a list of surcharges sequentially to a price. */
export function applySurcharges(price: PriceMoney, surcharges: readonly Surcharge[]): PriceMoney {
  return surcharges.reduce((current, s) => applySurcharge(current, s), price);
}

/** Compute the total surcharge amount across all surcharges (applied to the original price). */
export function totalSurchargeAmount(
  originalPrice: PriceMoney,
  surcharges: readonly Surcharge[],
): PriceMoney {
  const total = surcharges.reduce((sum, s) => {
    const extra = computeSurchargeAmount(originalPrice, s);
    return sum + extra.amount.baseUnits;
  }, 0n);
  return priceMoney(Usdc.fromBaseUnits(total), originalPrice.currency);
}
