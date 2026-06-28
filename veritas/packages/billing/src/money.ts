// Money value object representing USDC amounts in 6-decimal base units.

import { Usdc, USDC_DECIMALS } from "@veritas/core";

export interface MoneyValue {
  readonly amount: bigint; // base units (1 USDC = 1_000_000 units)
  readonly currency: "USDC";
}

const UNIT = BigInt(10 ** USDC_DECIMALS);

export function fromUsdc(usdc: Usdc): MoneyValue {
  const whole = BigInt(Math.trunc(Number(usdc)));
  return { amount: whole * UNIT, currency: "USDC" };
}

export function fromBaseUnits(units: bigint): MoneyValue {
  if (units < 0n) throw new RangeError(`Money amount cannot be negative: ${units}`);
  return { amount: units, currency: "USDC" };
}

export function fromDollars(dollars: number): MoneyValue {
  if (!Number.isFinite(dollars) || dollars < 0) {
    throw new RangeError(`Invalid dollar amount: ${dollars}`);
  }
  return { amount: BigInt(Math.round(dollars * Number(UNIT))), currency: "USDC" };
}

export function toUsdc(money: MoneyValue): number {
  return Number(money.amount) / Number(UNIT);
}

export function toBaseUnits(money: MoneyValue): bigint {
  return money.amount;
}

export function addMoney(a: MoneyValue, b: MoneyValue): MoneyValue {
  return { amount: a.amount + b.amount, currency: "USDC" };
}

export function subtractMoney(a: MoneyValue, b: MoneyValue): MoneyValue {
  if (b.amount > a.amount) {
    throw new RangeError(
      `Cannot subtract ${b.amount} from ${a.amount}: result would be negative`
    );
  }
  return { amount: a.amount - b.amount, currency: "USDC" };
}

export function multiplyMoney(money: MoneyValue, factor: number): MoneyValue {
  if (factor < 0) throw new RangeError("factor must be non-negative");
  const scaled = BigInt(Math.round(Number(money.amount) * factor));
  return { amount: scaled, currency: "USDC" };
}

export function multiplyMoneyByBigInt(money: MoneyValue, factor: bigint): MoneyValue {
  if (factor < 0n) throw new RangeError("factor must be non-negative");
  return { amount: money.amount * factor, currency: "USDC" };
}

export function zeroMoney(): MoneyValue {
  return { amount: 0n, currency: "USDC" };
}

export function isZeroMoney(money: MoneyValue): boolean {
  return money.amount === 0n;
}

export function compareMoney(a: MoneyValue, b: MoneyValue): -1 | 0 | 1 {
  if (a.amount < b.amount) return -1;
  if (a.amount > b.amount) return 1;
  return 0;
}

export function sumMoney(monies: readonly MoneyValue[]): MoneyValue {
  return monies.reduce(addMoney, zeroMoney());
}

export function formatMoney(money: MoneyValue): string {
  const whole = money.amount / UNIT;
  const frac = money.amount % UNIT;
  const fracPadded = frac.toString().padStart(USDC_DECIMALS, "0");
  return `${whole}.${fracPadded} USDC`;
}

export function maxMoney(a: MoneyValue, b: MoneyValue): MoneyValue {
  return a.amount >= b.amount ? a : b;
}

export function minMoney(a: MoneyValue, b: MoneyValue): MoneyValue {
  return a.amount <= b.amount ? a : b;
}
