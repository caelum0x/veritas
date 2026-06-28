// Usdc value object: 6-decimal fixed-point money with base-unit arithmetic.

import { ValidationError } from "./errors/validation-error.js";

/** Number of decimal places USDC uses on-chain. */
export const USDC_DECIMALS = 6;
const SCALE = 1_000_000n; // 10 ** 6

/**
 * An immutable USDC amount stored in integer base units (micro-USDC).
 * 1 USDC == 1_000_000 base units. All arithmetic stays in integers to
 * avoid floating-point drift.
 */
export class Usdc {
  /** Base units (micro-USDC). Always an integer bigint. */
  readonly baseUnits: bigint;

  private constructor(baseUnits: bigint) {
    this.baseUnits = baseUnits;
  }

  /** Zero USDC. */
  static readonly ZERO = new Usdc(0n);

  /** Construct directly from integer base units. */
  static fromBaseUnits(baseUnits: bigint | number): Usdc {
    const v = typeof baseUnits === "number" ? BigInt(Math.trunc(baseUnits)) : baseUnits;
    return new Usdc(v);
  }

  /** Construct from a decimal string like "12.50" or "0.000001". */
  static fromDecimalString(value: string): Usdc {
    if (!/^-?\d+(\.\d+)?$/.test(value)) {
      throw new ValidationError({ message: `Invalid USDC amount: ${value}` });
    }
    const negative = value.startsWith("-");
    const parts = value.replace("-", "").split(".");
    const whole = parts[0] ?? "0";
    const frac = parts[1] ?? "";
    if (frac.length > USDC_DECIMALS) {
      throw new ValidationError({
        message: `USDC supports at most ${USDC_DECIMALS} decimals: ${value}`,
      });
    }
    const padded = frac.padEnd(USDC_DECIMALS, "0");
    const units = BigInt(whole) * SCALE + BigInt(padded || "0");
    return new Usdc(negative ? -units : units);
  }

  /** Add two amounts, returning a new Usdc. */
  add(other: Usdc): Usdc {
    return new Usdc(this.baseUnits + other.baseUnits);
  }

  /** Subtract another amount, returning a new Usdc. */
  subtract(other: Usdc): Usdc {
    return new Usdc(this.baseUnits - other.baseUnits);
  }

  /** Multiply by an integer factor, returning a new Usdc. */
  multiply(factor: bigint | number): Usdc {
    const f = typeof factor === "number" ? BigInt(Math.trunc(factor)) : factor;
    return new Usdc(this.baseUnits * f);
  }

  /** Compare: -1, 0, or 1. */
  compare(other: Usdc): -1 | 0 | 1 {
    if (this.baseUnits < other.baseUnits) return -1;
    if (this.baseUnits > other.baseUnits) return 1;
    return 0;
  }

  /** Equality by base units. */
  equals(other: Usdc): boolean {
    return this.baseUnits === other.baseUnits;
  }

  /** True when strictly positive. */
  isPositive(): boolean {
    return this.baseUnits > 0n;
  }

  /** Render as a fixed 6-decimal string, e.g. "12.500000". */
  toDecimalString(): string {
    const neg = this.baseUnits < 0n;
    const abs = neg ? -this.baseUnits : this.baseUnits;
    const whole = abs / SCALE;
    const frac = (abs % SCALE).toString().padStart(USDC_DECIMALS, "0");
    return `${neg ? "-" : ""}${whole}.${frac}`;
  }

  /** Human-friendly display, e.g. "$12.50". Trailing zeros trimmed. */
  format(): string {
    const decimal = this.toDecimalString().replace(/0+$/, "").replace(/\.$/, "");
    return `$${decimal}`;
  }

  /** Serialize to the base-unit string for storage/transport. */
  toJSON(): string {
    return this.baseUnits.toString();
  }
}
