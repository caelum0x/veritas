// Credit service: orchestrates grant, consume, reserve, release, and expiry operations.

import { type UserId, type Result, ok, err, epochToIso } from "@veritas/core";
import { type CreditAmount } from "./credit.js";
import { makeGrant, type CreditGrant } from "./grant.js";
import { makeLedgerEntry } from "./ledger.js";
import {
  zeroBalance,
  applyGrant,
  applyConsumption,
  applyExpiry,
  applyReservation,
  applyReservationRelease,
  canAfford,
  type CreditBalance,
} from "./balance.js";
import { consumeCredits } from "./consumption.js";
import {
  createReservation,
  type CreditReservation,
} from "./reservation.js";
import { detectExpiredGrants } from "./expiry.js";
import {
  type CreditServiceDeps,
  type CreditStore,
  type CreditError,
  type GrantCreditsParams,
  type ConsumeCreditsParams,
  type ReserveCreditsParams,
  type ReleaseReservationParams,
} from "./types.js";
import {
  InsufficientCreditsError,
  ReservationNotFoundError,
} from "./errors.js";

/** Public credit service: single point of entry for all credit operations. */
export class CreditService {
  private readonly store: CreditStore;
  private readonly deps: CreditServiceDeps;
  // In-memory reservation registry (reservation id → CreditReservation).
  private readonly reservations = new Map<string, CreditReservation>();

  constructor(deps: CreditServiceDeps) {
    this.deps = deps;
    this.store = deps.store;
  }

  /** Grant credits to a user account. */
  async grant(
    params: GrantCreditsParams,
  ): Promise<Result<CreditGrant, CreditError>> {
    const now = epochToIso(this.deps.clock.now());
    const grant = makeGrant({
      userId: params.userId,
      amount: params.amount,
      source: params.source,
      reason: params.reason,
      grantedAt: now,
      expiresAt: params.expiresAt,
      metadata: params.metadata,
    });

    const saveResult = await this.store.saveGrant(grant);
    if (!saveResult.ok) return saveResult;

    const balanceResult = await this.store.getBalance(params.userId);
    if (!balanceResult.ok) return balanceResult;

    const current = balanceResult.value ?? zeroBalance(params.userId, now);
    const updated = applyGrant(current, params.amount, now);
    const balSave = await this.store.saveBalance(updated);
    if (!balSave.ok) return balSave;

    const entry = makeLedgerEntry({
      userId: params.userId,
      kind: "grant",
      delta: params.amount,
      grantId: grant.id,
      note: params.reason,
      recordedAt: now,
    });
    await this.store.appendLedgerEntry(entry);

    if (this.deps.notifier) {
      await this.deps.notifier.notifyGrantIssued(params.userId, grant);
    }

    return ok(grant);
  }

  /** Consume credits from a user's active grants. */
  async consume(
    params: ConsumeCreditsParams,
  ): Promise<Result<CreditBalance, CreditError>> {
    const now = epochToIso(this.deps.clock.now());
    const grantsResult = await this.store.findActiveGrants(params.userId, now);
    if (!grantsResult.ok) return grantsResult;

    const referenceId = params.referenceId ?? `consume-${now}`;
    const consumeResult = consumeCredits(
      params.userId,
      params.amount,
      grantsResult.value,
      referenceId,
      params.note,
      now,
    );
    if (!consumeResult.ok) return consumeResult;

    const { updatedGrants, ledgerEntries } = consumeResult.value;
    for (const g of updatedGrants) {
      await this.store.updateGrant(g);
    }
    for (const e of ledgerEntries) {
      await this.store.appendLedgerEntry(e);
    }

    const balanceResult = await this.store.getBalance(params.userId);
    if (!balanceResult.ok) return balanceResult;

    const current = balanceResult.value ?? zeroBalance(params.userId, now);
    const updated = applyConsumption(current, params.amount, now);
    const balSave = await this.store.saveBalance(updated);
    if (!balSave.ok) return balSave;

    await this.maybeNotifyLowBalance(params.userId, updated);
    return ok(updated);
  }

  /** Reserve credits for a pending operation. Returns the reservation ID. */
  async reserve(
    params: ReserveCreditsParams,
  ): Promise<Result<string, CreditError>> {
    const now = epochToIso(this.deps.clock.now());
    const balanceResult = await this.store.getBalance(params.userId);
    if (!balanceResult.ok) return balanceResult;

    const current = balanceResult.value ?? zeroBalance(params.userId, now);
    if (!canAfford(current, params.amount)) {
      return err(new InsufficientCreditsError(params.amount, current.available));
    }

    const referenceId = params.referenceId ?? `reserve-${now}`;
    const reserveResult = createReservation(
      params.userId,
      params.amount,
      current.available,
      referenceId,
      params.note,
      now,
    );
    if (!reserveResult.ok) return reserveResult;

    const { reservation, ledgerEntry } = reserveResult.value;
    this.reservations.set(reservation.id as string, reservation);

    const updated = applyReservation(current, params.amount, now);
    await this.store.saveBalance(updated);
    await this.store.appendLedgerEntry(ledgerEntry);

    return ok(reservation.id as string);
  }

  /** Commit or release a reservation by its ID. */
  async release(
    params: ReleaseReservationParams,
  ): Promise<Result<CreditBalance, CreditError>> {
    const now = epochToIso(this.deps.clock.now());
    const reservation = this.reservations.get(params.reservationId);
    if (!reservation) {
      return err(new ReservationNotFoundError(params.reservationId));
    }

    const amount = (params.amount ?? reservation.amount) as CreditAmount;
    const consumed = params.consume;

    const balanceResult = await this.store.getBalance(reservation.userId);
    if (!balanceResult.ok) return balanceResult;

    const current = balanceResult.value ?? zeroBalance(reservation.userId, now);
    const updated = applyReservationRelease(current, amount, consumed, now);
    const balSave = await this.store.saveBalance(updated);
    if (!balSave.ok) return balSave;

    const entry = makeLedgerEntry({
      userId: reservation.userId,
      kind: consumed ? "consume" : "release",
      delta: consumed ? -amount : amount,
      referenceId: params.reservationId,
      note: params.note ?? (consumed
        ? `Committed reservation ${params.reservationId}`
        : `Released reservation ${params.reservationId}`),
      recordedAt: now,
    });
    await this.store.appendLedgerEntry(entry);

    // Remove fully resolved reservations; partial releases stay in map with updated amount.
    if (amount >= reservation.amount) {
      this.reservations.delete(params.reservationId);
    } else {
      const remaining = (reservation.amount - amount) as CreditAmount;
      this.reservations.set(params.reservationId, Object.freeze({ ...reservation, amount: remaining }));
    }

    return ok(updated);
  }

  /** Get the current balance for a user. */
  async getBalance(userId: UserId): Promise<Result<CreditBalance, CreditError>> {
    const now = epochToIso(this.deps.clock.now());
    const result = await this.store.getBalance(userId);
    if (!result.ok) return result;
    return ok(result.value ?? zeroBalance(userId, now));
  }

  /** Expire credits for a user based on their grants. */
  async expireCredits(userId: UserId): Promise<Result<CreditAmount, CreditError>> {
    const now = epochToIso(this.deps.clock.now());
    const entriesResult = await this.store.findLedgerEntries(userId, "grant");
    if (!entriesResult.ok) return entriesResult;

    const grantIds = entriesResult.value
      .map((e) => e.grantId)
      .filter((id): id is NonNullable<typeof id> => id !== null);

    const allGrants: CreditGrant[] = [];
    for (const grantId of grantIds) {
      const gResult = await this.store.findGrant(grantId);
      if (gResult.ok && gResult.value) allGrants.push(gResult.value);
    }

    const expired = detectExpiredGrants(allGrants, now);
    if (expired.length === 0) return ok(0 as CreditAmount);

    let totalExpired = 0 as CreditAmount;
    for (const record of expired) {
      totalExpired = (totalExpired + record.expiredAmount) as CreditAmount;
      const gResult = await this.store.findGrant(record.grantId);
      if (!gResult.ok || !gResult.value) continue;
      const exhausted: CreditGrant = Object.freeze({ ...gResult.value, remaining: 0 as CreditAmount });
      await this.store.updateGrant(exhausted);
      const entry = makeLedgerEntry({
        userId,
        kind: "expire",
        delta: -record.expiredAmount,
        grantId: record.grantId,
        note: `Grant ${record.grantId} expired at ${record.expiresAt}`,
        recordedAt: now,
      });
      await this.store.appendLedgerEntry(entry);
    }

    const balanceResult = await this.store.getBalance(userId);
    if (!balanceResult.ok) return balanceResult;

    const current = balanceResult.value ?? zeroBalance(userId, now);
    const updated = applyExpiry(current, totalExpired, now);
    await this.store.saveBalance(updated);

    if (this.deps.notifier) {
      await this.deps.notifier.notifyExpiry(expired);
    }

    return ok(totalExpired);
  }

  private async maybeNotifyLowBalance(
    userId: UserId,
    balance: CreditBalance,
  ): Promise<void> {
    const threshold = this.deps.lowBalanceThreshold;
    if (threshold !== undefined && this.deps.notifier && balance.available <= threshold) {
      await this.deps.notifier.notifyLowBalance(userId, balance.available);
    }
  }
}
