// Credit expiry: identifies expired grants and computes amounts to claw back.

import { z } from "zod";
import { type UserId } from "@veritas/core";
import { type CreditAmount, creditAmountSchema } from "./credit.js";
import { type CreditGrant, isGrantExpired, type GrantId } from "./grant.js";

/** Summary of a single expired grant's reclaimable amount. */
export interface ExpiryRecord {
  readonly grantId: GrantId;
  readonly userId: UserId;
  readonly expiredAmount: CreditAmount;
  readonly expiresAt: string;
  readonly detectedAt: string;
}

export const expiryRecordSchema = z.object({
  grantId: z.string(),
  userId: z.string(),
  expiredAmount: creditAmountSchema,
  expiresAt: z.string().datetime(),
  detectedAt: z.string().datetime(),
});

/** Scan a list of grants and return expiry records for those past `now`. */
export function detectExpiredGrants(
  grants: ReadonlyArray<CreditGrant>,
  now: string,
): ReadonlyArray<ExpiryRecord> {
  return grants
    .filter((g) => isGrantExpired(g, now) && g.remaining > 0)
    .map((g) =>
      Object.freeze({
        grantId: g.id,
        userId: g.userId,
        expiredAmount: g.remaining,
        expiresAt: g.expiresAt as string,
        detectedAt: now,
      }),
    );
}

/** Compute total credits lost to expiry across a set of records. */
export function totalExpiredAmount(records: ReadonlyArray<ExpiryRecord>): CreditAmount {
  return records.reduce((sum, r) => sum + r.expiredAmount, 0) as CreditAmount;
}

/** Group expiry records by userId for batch processing. */
export function groupExpiryByUser(
  records: ReadonlyArray<ExpiryRecord>,
): ReadonlyMap<string, ReadonlyArray<ExpiryRecord>> {
  const map = new Map<string, ExpiryRecord[]>();
  for (const record of records) {
    const key = record.userId as string;
    const existing = map.get(key);
    if (existing) {
      existing.push(record);
    } else {
      map.set(key, [record]);
    }
  }
  return map as ReadonlyMap<string, ReadonlyArray<ExpiryRecord>>;
}

/** Derive the next expiry date from a list of non-expired grants (earliest wins). */
export function nextExpiryDate(
  grants: ReadonlyArray<CreditGrant>,
  now: string,
): string | null {
  const active = grants
    .filter((g) => g.expiresAt !== null && !isGrantExpired(g, now) && g.remaining > 0)
    .map((g) => g.expiresAt as string)
    .sort();
  return active.length > 0 ? (active[0] as string) : null;
}
