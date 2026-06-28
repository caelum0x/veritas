// Pricing helpers for quoting USDC amounts based on verification effort.

import { Usdc } from "@veritas/core";

/** Minimum accepted price per verification (0.10 USDC). */
const PRICE_LOW_EFFORT = Usdc.fromDecimalString("0.10");

/** Standard effort price (0.25 USDC). */
const PRICE_STANDARD_EFFORT = Usdc.fromDecimalString("0.25");

/** High effort price (0.50 USDC). */
const PRICE_HIGH_EFFORT = Usdc.fromDecimalString("0.50");

/** Returns the minimum acceptable USDC amount for the given effort level. */
export function minPriceForEffort(effort: "low" | "standard" | "high"): Usdc {
  switch (effort) {
    case "low":
      return PRICE_LOW_EFFORT;
    case "standard":
      return PRICE_STANDARD_EFFORT;
    case "high":
      return PRICE_HIGH_EFFORT;
  }
}

/** Returns the quoted USDC amount we advertise for the given effort level. */
export function quotePriceForEffort(effort: "low" | "standard" | "high"): Usdc {
  return minPriceForEffort(effort);
}

/** Returns true if the offered amount meets or exceeds the minimum for this effort. */
export function isPriceAcceptable(
  offeredUsdc: Usdc,
  effort: "low" | "standard" | "high",
): boolean {
  const min = minPriceForEffort(effort);
  return offeredUsdc.compare(min) >= 0;
}
