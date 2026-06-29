// Shared type aliases, enums, and port interfaces for the credits module.

import { type Result, type UserId, type Clock } from "@veritas/core";
import { type CreditAmount, type CreditSource } from "./credit.js";
import { type CreditBalance } from "./balance.js";
import { type CreditGrant, type GrantId } from "./grant.js";
import { type LedgerEntry, type LedgerEntryKind } from "./ledger.js";
import { type ExpiryRecord } from "./expiry.js";
import {
  type InsufficientCreditsError,
  type GrantNotFoundError,
  type GrantExpiredError,
  type GrantExhaustedError,
  type ReservationNotFoundError,
  type ReservationOverdrawError,
  type CreditPolicyViolationError,
} from "./errors.js";

/** Union of all credit-domain errors. */
export type CreditError =
  | InsufficientCreditsError
  | GrantNotFoundError
  | GrantExpiredError
  | GrantExhaustedError
  | ReservationNotFoundError
  | ReservationOverdrawError
  | CreditPolicyViolationError;

/** Parameters for granting credits to a user. */
export interface GrantCreditsParams {
  readonly userId: UserId;
  readonly amount: CreditAmount;
  readonly source: CreditSource;
  readonly reason: string;
  readonly expiresAt: string | null;
  readonly metadata?: Record<string, string>;
}

/** Parameters for consuming credits from a user's balance. */
export interface ConsumeCreditsParams {
  readonly userId: UserId;
  readonly amount: CreditAmount;
  readonly referenceId?: string;
  readonly note: string;
}

/** Parameters for reserving credits (hold before consuming). */
export interface ReserveCreditsParams {
  readonly userId: UserId;
  readonly amount: CreditAmount;
  readonly referenceId?: string;
  readonly note: string;
  /** ISO timestamp after which the reservation auto-expires. */
  readonly expiresAt: string | null;
}

/** Parameters for releasing or finalizing a reservation. */
export interface ReleaseReservationParams {
  readonly reservationId: string;
  /** If true, the held amount is consumed; if false, it is returned to available. */
  readonly consume: boolean;
  /** Actual amount to consume or release (must be <= reserved amount). */
  readonly amount?: CreditAmount;
  readonly note?: string;
}

/** Port interface: persistent storage for credit grants and balances. */
export interface CreditStore {
  /** Persist a new grant and return it. */
  saveGrant(grant: CreditGrant): Promise<Result<CreditGrant, CreditError>>;
  /** Load a grant by id. */
  findGrant(id: GrantId): Promise<Result<CreditGrant | null, CreditError>>;
  /** Load all non-exhausted, non-expired grants for a user (ordered oldest first). */
  findActiveGrants(userId: UserId, now: string): Promise<Result<ReadonlyArray<CreditGrant>, CreditError>>;
  /** Persist an updated grant (e.g. after deduction). */
  updateGrant(grant: CreditGrant): Promise<Result<CreditGrant, CreditError>>;
  /** Append a ledger entry. */
  appendLedgerEntry(entry: LedgerEntry): Promise<Result<LedgerEntry, CreditError>>;
  /** Load ledger entries for a user, optionally filtered by kind. */
  findLedgerEntries(
    userId: UserId,
    kind?: LedgerEntryKind,
  ): Promise<Result<ReadonlyArray<LedgerEntry>, CreditError>>;
  /** Read the current balance snapshot for a user. */
  getBalance(userId: UserId): Promise<Result<CreditBalance | null, CreditError>>;
  /** Persist an updated balance snapshot. */
  saveBalance(balance: CreditBalance): Promise<Result<CreditBalance, CreditError>>;
}

/** Port interface: notification sink for credit events. */
export interface CreditNotifier {
  notifyLowBalance(userId: UserId, available: CreditAmount): Promise<void>;
  notifyGrantIssued(userId: UserId, grant: CreditGrant): Promise<void>;
  notifyExpiry(records: ReadonlyArray<ExpiryRecord>): Promise<void>;
}

/** Dependency bundle injected into the credit service. */
export interface CreditServiceDeps {
  readonly store: CreditStore;
  readonly clock: Clock;
  readonly notifier?: CreditNotifier;
  /** Available credits threshold below which a low-balance notification fires. */
  readonly lowBalanceThreshold?: CreditAmount;
}
