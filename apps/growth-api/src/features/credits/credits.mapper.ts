// Maps @veritas/credits domain objects to HTTP response shapes.
import type { CreditBalance, CreditGrant, LedgerEntry } from "@veritas/credits";

export interface BalanceResponse {
  readonly userId: string;
  readonly available: number;
  readonly reserved: number;
  readonly lifetimeGranted: number;
  readonly lifetimeConsumed: number;
  readonly lifetimeExpired: number;
  readonly updatedAt: string;
}

export interface GrantResponse {
  readonly id: string;
  readonly userId: string;
  readonly amount: number;
  readonly remaining: number;
  readonly source: string;
  readonly reason: string;
  readonly grantedAt: string;
  readonly expiresAt: string | null;
  readonly metadata: Record<string, string>;
}

export interface LedgerEntryResponse {
  readonly id: string;
  readonly userId: string;
  readonly kind: string;
  readonly delta: number;
  readonly grantId: string | null;
  readonly referenceId: string | null;
  readonly note: string;
  readonly recordedAt: string;
}

export function toBalanceResponse(balance: CreditBalance): BalanceResponse {
  return {
    userId: balance.userId as string,
    available: balance.available,
    reserved: balance.reserved,
    lifetimeGranted: balance.lifetimeGranted,
    lifetimeConsumed: balance.lifetimeConsumed,
    lifetimeExpired: balance.lifetimeExpired,
    updatedAt: balance.updatedAt,
  };
}

export function toGrantResponse(grant: CreditGrant): GrantResponse {
  return {
    id: grant.id as string,
    userId: grant.userId as string,
    amount: grant.amount,
    remaining: grant.remaining,
    source: grant.source,
    reason: grant.reason,
    grantedAt: grant.grantedAt,
    expiresAt: grant.expiresAt,
    metadata: grant.metadata,
  };
}

export function toLedgerEntryResponse(entry: LedgerEntry): LedgerEntryResponse {
  return {
    id: entry.id as string,
    userId: entry.userId as string,
    kind: entry.kind,
    delta: entry.delta,
    grantId: entry.grantId as string | null,
    referenceId: entry.referenceId,
    note: entry.note,
    recordedAt: entry.recordedAt,
  };
}
