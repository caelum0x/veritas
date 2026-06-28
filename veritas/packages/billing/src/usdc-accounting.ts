// USDC base-unit accounting helpers for precise 6-decimal arithmetic.

import { USDC_DECIMALS } from "@veritas/core";

const UNIT = BigInt(10 ** USDC_DECIMALS); // 1_000_000n

/** Parse a human-readable USDC string like "12.50" into base units. */
export function parseUsdcString(value: string): bigint {
  const trimmed = value.trim();
  const dotIdx = trimmed.indexOf(".");
  if (dotIdx === -1) {
    return BigInt(trimmed) * UNIT;
  }
  const wholePart = trimmed.slice(0, dotIdx);
  const fracRaw = trimmed.slice(dotIdx + 1);
  if (fracRaw.length > USDC_DECIMALS) {
    throw new Error(
      `USDC value has more than ${USDC_DECIMALS} decimal places: "${value}"`
    );
  }
  const fracPadded = fracRaw.padEnd(USDC_DECIMALS, "0");
  return BigInt(wholePart) * UNIT + BigInt(fracPadded);
}

/** Format base units into a human-readable USDC string, e.g. "12.500000". */
export function formatUsdcString(units: bigint): string {
  if (units < 0n) throw new RangeError("units must be non-negative");
  const whole = units / UNIT;
  const frac = units % UNIT;
  return `${whole}.${frac.toString().padStart(USDC_DECIMALS, "0")}`;
}

/** Convert a float number (e.g. 1.5) to base units, rounding to nearest. */
export function floatToBaseUnits(value: number): bigint {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`USDC value must be a non-negative finite number, got ${value}`);
  }
  return BigInt(Math.round(value * Number(UNIT)));
}

/** Convert base units back to a float. May lose precision for large amounts. */
export function baseUnitsToFloat(units: bigint): number {
  return Number(units) / Number(UNIT);
}

/**
 * Split an amount proportionally across weights (positive integers).
 * Uses largest-remainder method to avoid off-by-one micro-unit errors.
 */
export function splitProportional(
  total: bigint,
  weights: readonly number[]
): bigint[] {
  if (weights.length === 0) return [];
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum === 0) throw new Error("weights must sum to > 0");

  const shares: bigint[] = weights.map((w) =>
    BigInt(Math.floor((Number(total) * w) / weightSum))
  );

  const distributed = shares.reduce((a, b) => a + b, 0n);
  let remainder = total - distributed;

  const remainders = weights.map(
    (w) => (Number(total) * w) / weightSum - Math.floor((Number(total) * w) / weightSum)
  );
  const order = remainders
    .map((r, i) => ({ r, i }))
    .sort((a, b) => b.r - a.r)
    .map((x) => x.i);

  const result = [...shares];
  for (const idx of order) {
    if (remainder <= 0n) break;
    result[idx] = result[idx]! + 1n;
    remainder -= 1n;
  }
  return result;
}

/** Apply a basis-point fee rate (e.g. 250 = 2.50%) to an amount, rounding to nearest. */
export function applyBasisPoints(amount: bigint, bps: number): bigint {
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) {
    throw new RangeError(`bps must be an integer in [0, 10000], got ${bps}`);
  }
  return BigInt(Math.round((Number(amount) * bps) / 10_000));
}

/** Clamp a USDC base-unit amount to [min, max]. */
export function clampBaseUnits(
  value: bigint,
  min: bigint,
  max: bigint
): bigint {
  if (min > max) throw new RangeError(`min (${min}) must be <= max (${max})`);
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Return true if units represent a whole number of USDC (no fractional part). */
export function isWholeUsdc(units: bigint): boolean {
  return units % UNIT === 0n;
}

/** Ceiling-divide: return ⌈amount / divisor⌉ in base units. */
export function ceilDivide(amount: bigint, divisor: bigint): bigint {
  if (divisor === 0n) throw new RangeError("divisor must be non-zero");
  if (amount < 0n) throw new RangeError("amount must be non-negative");
  return (amount + divisor - 1n) / divisor;
}

/**
 * Compute the percentage of a total (0–100 with 2 decimal precision).
 * Returns 0 when total is zero to avoid division errors.
 */
export function percentageOf(part: bigint, total: bigint): number {
  if (total === 0n) return 0;
  return Math.round((Number(part) / Number(total)) * 10_000) / 100;
}

/** Convert whole USD cents (integer) to USDC base units. */
export function centsToBaseUnits(cents: number): bigint {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new RangeError(`cents must be a non-negative integer, got ${cents}`);
  }
  // 1 cent = 0.01 USD = 10_000 micro-USDC
  return BigInt(cents) * 10_000n;
}
