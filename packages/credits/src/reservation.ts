// Reserve credits: hold credits against a future operation, then commit or release.

import { newId, type Id, type UserId, type Result, ok, err } from "@veritas/core";
import { type CreditAmount } from "./credit.js";
import { makeLedgerEntry, type LedgerEntry } from "./ledger.js";
import { InsufficientCreditsError } from "./errors.js";

/** Branded reservation identifier. */
export type ReservationId = Id<"reservation">;
export const newReservationId = (): ReservationId => newId("reservation");

/** Status of a credit reservation. */
export type ReservationStatus = "pending" | "committed" | "released";

/** Immutable credit reservation record. */
export interface CreditReservation {
  readonly id: ReservationId;
  readonly userId: UserId;
  readonly amount: CreditAmount;
  readonly referenceId: string;
  readonly status: ReservationStatus;
  readonly note: string;
  readonly createdAt: string;
  readonly resolvedAt: string | null;
}

/** Result of creating a reservation. */
export interface ReservationResult {
  readonly reservation: CreditReservation;
  readonly ledgerEntry: LedgerEntry;
}

/** Create a new pending reservation if sufficient credits are available. */
export function createReservation(
  userId: UserId,
  amount: CreditAmount,
  availableCredits: CreditAmount,
  referenceId: string,
  note: string,
  now: string,
): Result<ReservationResult, InsufficientCreditsError> {
  if (availableCredits < amount) {
    return err(new InsufficientCreditsError(amount, availableCredits));
  }

  const reservation: CreditReservation = Object.freeze({
    id: newReservationId(),
    userId,
    amount,
    referenceId,
    status: "pending" as ReservationStatus,
    note,
    createdAt: now,
    resolvedAt: null,
  });

  const ledgerEntry = makeLedgerEntry({
    userId,
    kind: "reserve",
    delta: -amount,
    referenceId,
    note: `Reserved ${amount} credits for ${referenceId}`,
    recordedAt: now,
  });

  return ok(Object.freeze({ reservation, ledgerEntry }));
}

/** Commit a pending reservation (credits consumed, not returned). */
export function commitReservation(
  reservation: CreditReservation,
  now: string,
): { reservation: CreditReservation; ledgerEntry: LedgerEntry } {
  const updated: CreditReservation = Object.freeze({
    ...reservation,
    status: "committed" as ReservationStatus,
    resolvedAt: now,
  });

  const ledgerEntry = makeLedgerEntry({
    userId: reservation.userId,
    kind: "consume",
    delta: 0,
    referenceId: reservation.referenceId,
    note: `Committed reservation ${reservation.id}`,
    recordedAt: now,
  });

  return Object.freeze({ reservation: updated, ledgerEntry });
}

/** Release a pending reservation, returning credits to available. */
export function releaseReservation(
  reservation: CreditReservation,
  now: string,
): { reservation: CreditReservation; ledgerEntry: LedgerEntry } {
  const updated: CreditReservation = Object.freeze({
    ...reservation,
    status: "released" as ReservationStatus,
    resolvedAt: now,
  });

  const ledgerEntry = makeLedgerEntry({
    userId: reservation.userId,
    kind: "release",
    delta: reservation.amount,
    referenceId: reservation.referenceId,
    note: `Released reservation ${reservation.id}`,
    recordedAt: now,
  });

  return Object.freeze({ reservation: updated, ledgerEntry });
}

/** Compute total pending reserved amount from a list of reservations. */
export function totalPendingReserved(
  reservations: ReadonlyArray<CreditReservation>,
): CreditAmount {
  return reservations
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + r.amount, 0) as CreditAmount;
}
