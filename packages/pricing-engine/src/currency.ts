// Currency helpers: conversion, formatting, and validation.

import { Usdc } from "@veritas/core";
import { type Currency, type PriceMoney, priceMoney } from "./types.js";
import { CurrencyMismatchError } from "./errors.js";

/** Assert both sides share the same currency before arithmetic. */
export function assertSameCurrency(a: PriceMoney, b: PriceMoney): void {
  if (a.currency !== b.currency) {
    throw new CurrencyMismatchError(a.currency, b.currency);
  }
}

/** Add two PriceMoney values (must share currency). */
export function addMoney(a: PriceMoney, b: PriceMoney): PriceMoney {
  assertSameCurrency(a, b);
  return priceMoney(a.amount.add(b.amount), a.currency);
}

/** Subtract b from a (must share currency). */
export function subtractMoney(a: PriceMoney, b: PriceMoney): PriceMoney {
  assertSameCurrency(a, b);
  return priceMoney(a.amount.subtract(b.amount), a.currency);
}

/** Multiply a PriceMoney by an integer factor. */
export function multiplyMoney(m: PriceMoney, factor: number): PriceMoney {
  return priceMoney(m.amount.multiply(BigInt(Math.trunc(factor))), m.currency);
}

/** Clamp money to a minimum of zero. */
export function clampToZero(m: PriceMoney): PriceMoney {
  if (m.amount.compare(Usdc.ZERO) < 0) {
    return priceMoney(Usdc.ZERO, m.currency);
  }
  return m;
}

/** Convert a contracts Money DTO ({ currency, amount: bigint string }) to PriceMoney. */
export function fromMoneyDto(dto: { currency: string; amount: string }): PriceMoney {
  const currency = dto.currency as Currency;
  return priceMoney(Usdc.fromBaseUnits(BigInt(dto.amount)), currency);
}

/** Convert PriceMoney to a contracts Money DTO. */
export function toMoneyDto(m: PriceMoney): { currency: string; amount: string } {
  return { currency: m.currency, amount: m.amount.baseUnits.toString() };
}
