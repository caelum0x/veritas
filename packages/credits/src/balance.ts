// Credit balance: aggregated available, reserved, and expired amounts for an account.

import { z } from "zod";
import { type UserId } from "@veritas/core";
import { creditAmountSchema, type CreditAmount } from "./credit.js";

/** Immutable snapshot of a user's credit balance. */
export interface CreditBalance {
  readonly userId: UserId;
  readonly available: CreditAmount;
  readonly reserved: CreditAmount;
  readonly lifetimeGranted: CreditAmount;
  readonly lifetimeConsumed: CreditAmount;
  readonly lifetimeExpired: CreditAmount;
  readonly updatedAt: string;
}

export const creditBalanceSchema = z.object({
  userId: z.string(),
  available: creditAmountSchema,
  reserved: creditAmountSchema,
  lifetimeGranted: creditAmountSchema,
  lifetimeConsumed: creditAmountSchema,
  lifetimeExpired: creditAmountSchema,
  updatedAt: z.string().datetime(),
});

/** Compute total balance (available + reserved). */
export function totalBalance(balance: CreditBalance): CreditAmount {
  return (balance.available + balance.reserved) as CreditAmount;
}

/** Return true when the account has at least `amount` available credits. */
export function canAfford(balance: CreditBalance, amount: CreditAmount): boolean {
  return balance.available >= amount;
}

/** Return a zero-value balance for a user (no history). */
export function zeroBalance(userId: UserId, at: string): CreditBalance {
  return Object.freeze({
    userId,
    available: 0 as CreditAmount,
    reserved: 0 as CreditAmount,
    lifetimeGranted: 0 as CreditAmount,
    lifetimeConsumed: 0 as CreditAmount,
    lifetimeExpired: 0 as CreditAmount,
    updatedAt: at,
  });
}

/** Apply a grant delta to produce a new balance snapshot. */
export function applyGrant(
  balance: CreditBalance,
  amount: CreditAmount,
  at: string,
): CreditBalance {
  return Object.freeze({
    ...balance,
    available: (balance.available + amount) as CreditAmount,
    lifetimeGranted: (balance.lifetimeGranted + amount) as CreditAmount,
    updatedAt: at,
  });
}

/** Apply a consumption delta to produce a new balance snapshot. */
export function applyConsumption(
  balance: CreditBalance,
  amount: CreditAmount,
  at: string,
): CreditBalance {
  return Object.freeze({
    ...balance,
    available: (balance.available - amount) as CreditAmount,
    lifetimeConsumed: (balance.lifetimeConsumed + amount) as CreditAmount,
    updatedAt: at,
  });
}

/** Apply an expiry delta to produce a new balance snapshot. */
export function applyExpiry(
  balance: CreditBalance,
  amount: CreditAmount,
  at: string,
): CreditBalance {
  return Object.freeze({
    ...balance,
    available: (balance.available - amount) as CreditAmount,
    lifetimeExpired: (balance.lifetimeExpired + amount) as CreditAmount,
    updatedAt: at,
  });
}

/** Move credits from available to reserved. */
export function applyReservation(
  balance: CreditBalance,
  amount: CreditAmount,
  at: string,
): CreditBalance {
  return Object.freeze({
    ...balance,
    available: (balance.available - amount) as CreditAmount,
    reserved: (balance.reserved + amount) as CreditAmount,
    updatedAt: at,
  });
}

/** Release reserved credits back to available or consume them. */
export function applyReservationRelease(
  balance: CreditBalance,
  amount: CreditAmount,
  consumed: boolean,
  at: string,
): CreditBalance {
  const base = Object.freeze({
    ...balance,
    reserved: (balance.reserved - amount) as CreditAmount,
    updatedAt: at,
  });
  if (consumed) {
    return Object.freeze({
      ...base,
      lifetimeConsumed: (base.lifetimeConsumed + amount) as CreditAmount,
    });
  }
  return Object.freeze({
    ...base,
    available: (base.available + amount) as CreditAmount,
  });
}
