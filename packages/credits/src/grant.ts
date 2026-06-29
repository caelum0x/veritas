// Grant: records a credit issuance event with source, amount, and expiry.

import { z } from "zod";
import { newId, type Id, type UserId } from "@veritas/core";
import { creditAmountSchema, creditSourceSchema, type CreditAmount, type CreditSource } from "./credit.js";

/** Branded grant identifier. */
export type GrantId = Id<"grant">;
export const newGrantId = (): GrantId => newId("grant");

/** Immutable credit grant record. */
export interface CreditGrant {
  readonly id: GrantId;
  readonly userId: UserId;
  readonly amount: CreditAmount;
  readonly remaining: CreditAmount;
  readonly source: CreditSource;
  readonly reason: string;
  readonly grantedAt: string;
  readonly expiresAt: string | null;
  readonly metadata: Record<string, string>;
}

export const creditGrantSchema = z.object({
  id: z.string(),
  userId: z.string(),
  amount: creditAmountSchema,
  remaining: creditAmountSchema,
  source: creditSourceSchema,
  reason: z.string().min(1),
  grantedAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(),
  metadata: z.record(z.string()),
});

export interface CreateGrantParams {
  readonly userId: UserId;
  readonly amount: CreditAmount;
  readonly source: CreditSource;
  readonly reason: string;
  readonly grantedAt: string;
  readonly expiresAt: string | null;
  readonly metadata?: Record<string, string>;
}

/** Construct a new CreditGrant. */
export function makeGrant(params: CreateGrantParams): CreditGrant {
  return Object.freeze({
    id: newGrantId(),
    userId: params.userId,
    amount: params.amount,
    remaining: params.amount,
    source: params.source,
    reason: params.reason,
    grantedAt: params.grantedAt,
    expiresAt: params.expiresAt,
    metadata: Object.freeze({ ...params.metadata }),
  });
}

/** Deduct `used` from a grant's remaining balance, returning a new grant. */
export function deductFromGrant(grant: CreditGrant, used: CreditAmount): CreditGrant {
  const next = (grant.remaining - used) as CreditAmount;
  if (next < 0) {
    throw new RangeError(`Cannot deduct ${used} from grant ${grant.id} with ${grant.remaining} remaining`);
  }
  return Object.freeze({ ...grant, remaining: next });
}

/** Return true when the grant has no credits left. */
export function isGrantExhausted(grant: CreditGrant): boolean {
  return grant.remaining === 0;
}

/** Return true when the grant has expired relative to `now`. */
export function isGrantExpired(grant: CreditGrant, now: string): boolean {
  return grant.expiresAt !== null && grant.expiresAt <= now;
}

/** Return the amount still available (ignores expiry — caller must check). */
export function grantAvailable(grant: CreditGrant): CreditAmount {
  return grant.remaining;
}
