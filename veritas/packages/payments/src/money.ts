// USDC amount helpers: arithmetic, comparison, formatting, and validation utilities.

import { Usdc, USDC_DECIMALS } from "@veritas/core";
import { ValidationError } from "@veritas/core";

export { Usdc, USDC_DECIMALS };

/** Sum an array of Usdc amounts, returning ZERO for an empty array. */
export function sumUsdc(amounts: ReadonlyArray<Usdc>): Usdc {
  return amounts.reduce((acc, a) => acc.add(a), Usdc.ZERO);
}

/** Return the larger of two Usdc amounts. */
export function maxUsdc(a: Usdc, b: Usdc): Usdc {
  return a.compare(b) >= 0 ? a : b;
}

/** Return the smaller of two Usdc amounts. */
export function minUsdc(a: Usdc, b: Usdc): Usdc {
  return a.compare(b) <= 0 ? a : b;
}

/** Multiply a Usdc amount by a decimal rate (e.g. 0.025 for 2.5%). Truncates to 6 decimals. */
export function multiplyByRate(amount: Usdc, rate: number): Usdc {
  if (rate < 0) throw new ValidationError({ message: "Rate must be non-negative" });
  // Scale rate to avoid floating-point imprecision: multiply in bigint space.
  const RATE_SCALE = 1_000_000n;
  const scaledRate = BigInt(Math.round(rate * Number(RATE_SCALE)));
  const rawUnits = (amount.baseUnits * scaledRate) / RATE_SCALE;
  return Usdc.fromBaseUnits(rawUnits);
}

/** Divide a Usdc amount into N equal parts; remainder goes to the first part. */
export function splitUsdc(amount: Usdc, parts: number): ReadonlyArray<Usdc> {
  if (!Number.isInteger(parts) || parts < 1) {
    throw new ValidationError({ message: "Parts must be a positive integer" });
  }
  const n = BigInt(parts);
  const each = amount.baseUnits / n;
  const remainder = amount.baseUnits % n;
  return Array.from({ length: parts }, (_, i) =>
    Usdc.fromBaseUnits(i === 0 ? each + remainder : each)
  );
}

/** Parse a human-readable dollar string like "$12.50" or "12.50" to Usdc. */
export function parseUsdcString(value: string): Usdc {
  const cleaned = value.replace(/^\$/, "").trim();
  return Usdc.fromDecimalString(cleaned);
}

/** Assert a Usdc amount is strictly positive or throw ValidationError. */
export function requirePositive(amount: Usdc, label = "amount"): void {
  if (!amount.isPositive()) {
    throw new ValidationError({ message: `${label} must be positive; got ${amount.toDecimalString()}` });
  }
}

/** Assert a Usdc amount is non-negative (>= 0) or throw ValidationError. */
export function requireNonNegative(amount: Usdc, label = "amount"): void {
  if (amount.compare(Usdc.ZERO) < 0) {
    throw new ValidationError({ message: `${label} must be non-negative; got ${amount.toDecimalString()}` });
  }
}

/** Convert base-unit number/bigint to a Usdc (convenience wrapper). */
export function fromBaseUnits(units: bigint | number): Usdc {
  return Usdc.fromBaseUnits(units);
}

/** Convert a decimal string (no $ prefix) to Usdc. */
export function fromDecimalString(value: string): Usdc {
  return Usdc.fromDecimalString(value);
}
