// Credit value object: typed, branded unit of credit quantity and metadata.

import { z } from "zod";
import { newId, type Id } from "@veritas/core";

/** Branded credit identifier. */
export type CreditId = Id<"credit">;
export const newCreditId = (): CreditId => newId("credit");

/** Validated schema for a non-negative credit amount (integer micro-units). */
export const creditAmountSchema = z.number().int().nonnegative();

/** Represents a discrete credit quantity in integer micro-units (1 credit = 1_000_000 units). */
export type CreditAmount = z.infer<typeof creditAmountSchema>;

export const CREDIT_MICRO_UNIT = 1_000_000 as const;

/** Convert whole credits to micro-units. */
export function toMicroUnits(wholeCredits: number): CreditAmount {
  return Math.round(wholeCredits * CREDIT_MICRO_UNIT);
}

/** Convert micro-units back to whole credits (may be fractional). */
export function fromMicroUnits(microUnits: CreditAmount): number {
  return microUnits / CREDIT_MICRO_UNIT;
}

/** Source from which credits were granted. */
export type CreditSource = "purchase" | "promotional" | "referral" | "trial" | "adjustment";

export const creditSourceSchema = z.enum([
  "purchase",
  "promotional",
  "referral",
  "trial",
  "adjustment",
]);

/** Immutable credit value object. */
export interface Credit {
  readonly id: CreditId;
  readonly amount: CreditAmount;
  readonly source: CreditSource;
  readonly createdAt: string;
  readonly expiresAt: string | null;
  readonly metadata: Record<string, string>;
}

export const creditSchema = z.object({
  id: z.string(),
  amount: creditAmountSchema,
  source: creditSourceSchema,
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(),
  metadata: z.record(z.string()),
});

/** Construct a new Credit value object. */
export function makeCredit(params: {
  amount: CreditAmount;
  source: CreditSource;
  createdAt: string;
  expiresAt: string | null;
  metadata?: Record<string, string>;
}): Credit {
  return Object.freeze({
    id: newCreditId(),
    amount: params.amount,
    source: params.source,
    createdAt: params.createdAt,
    expiresAt: params.expiresAt,
    metadata: Object.freeze({ ...params.metadata }),
  });
}
