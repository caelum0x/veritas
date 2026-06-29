// Wallet aggregate root managing USDC balance and reservations via event sourcing.
import { ValidationError } from "@veritas/core";
import type { Usdc } from "@veritas/core";
import { AggregateRoot } from "../aggregate-root.js";
import type { StoredEvent } from "../domain-event.js";
import { WALLET_EVENT_TYPES } from "./wallet.events.js";
import type {
  WalletCreatedPayload,
  FundsDepositedPayload,
  FundsWithdrawnPayload,
  FundsReservedPayload,
  ReservationReleasedPayload,
  ReservationSettledPayload,
  WalletFrozenPayload,
} from "./wallet.events.js";
import type { TransactionKind } from "@veritas/contracts";

interface Reservation {
  readonly reservationId: string;
  readonly amount: Usdc;
  readonly orderId: string;
}

export class WalletAggregate extends AggregateRoot {
  readonly aggregateType = "Wallet" as const;

  private _id: string = "";
  private _organizationId: string = "";
  private _currency: string = "USDC";
  private _balance: bigint = 0n;
  private _reservedAmount: bigint = 0n;
  private _reservations: ReadonlyArray<Reservation> = [];
  private _frozen: boolean = false;

  get id(): string { return this._id; }
  get organizationId(): string { return this._organizationId; }
  get currency(): string { return this._currency; }
  get balance(): bigint { return this._balance; }
  get availableBalance(): bigint { return this._balance - this._reservedAmount; }
  get reservedAmount(): bigint { return this._reservedAmount; }
  get reservations(): ReadonlyArray<Reservation> { return this._reservations; }
  get frozen(): boolean { return this._frozen; }

  static create(
    walletId: string,
    organizationId: string,
    currency: string = "USDC"
  ): WalletAggregate {
    const agg = new WalletAggregate();
    agg._id = walletId;
    const payload: WalletCreatedPayload = { walletId, organizationId, currency };
    agg.raise(WALLET_EVENT_TYPES.WALLET_CREATED, payload);
    return agg;
  }

  deposit(
    amount: Usdc,
    transactionId: string,
    kind: TransactionKind,
    reference?: string
  ): void {
    if (this._frozen) {
      throw new ValidationError({ message: "Cannot deposit into a frozen wallet" });
    }
    const payload: FundsDepositedPayload = {
      walletId: this._id,
      amount,
      transactionId,
      kind,
      reference,
    };
    this.raise(WALLET_EVENT_TYPES.FUNDS_DEPOSITED, payload);
  }

  withdraw(
    amount: Usdc,
    transactionId: string,
    kind: TransactionKind,
    reference?: string
  ): void {
    if (this._frozen) {
      throw new ValidationError({ message: "Cannot withdraw from a frozen wallet" });
    }
    const amountBig = amount.baseUnits;
    if (this.availableBalance < amountBig) {
      throw new ValidationError({
        message: `Insufficient available balance: have ${this.availableBalance}, need ${amountBig}`,
      });
    }
    const payload: FundsWithdrawnPayload = {
      walletId: this._id,
      amount,
      transactionId,
      kind,
      reference,
    };
    this.raise(WALLET_EVENT_TYPES.FUNDS_WITHDRAWN, payload);
  }

  reserve(reservationId: string, amount: Usdc, orderId: string): void {
    if (this._frozen) {
      throw new ValidationError({ message: "Cannot reserve funds in a frozen wallet" });
    }
    const amountBig = amount.baseUnits;
    if (this.availableBalance < amountBig) {
      throw new ValidationError({
        message: `Insufficient available balance to reserve: have ${this.availableBalance}, need ${amountBig}`,
      });
    }
    if (this._reservations.some((r) => r.reservationId === reservationId)) {
      throw new ValidationError({ message: `Reservation ${reservationId} already exists` });
    }
    const payload: FundsReservedPayload = {
      walletId: this._id,
      reservationId,
      amount,
      orderId,
    };
    this.raise(WALLET_EVENT_TYPES.FUNDS_RESERVED, payload);
  }

  releaseReservation(reservationId: string): void {
    const reservation = this._reservations.find(
      (r) => r.reservationId === reservationId
    );
    if (!reservation) {
      throw new ValidationError({ message: `Reservation ${reservationId} not found` });
    }
    const payload: ReservationReleasedPayload = {
      walletId: this._id,
      reservationId,
      amount: reservation.amount,
    };
    this.raise(WALLET_EVENT_TYPES.RESERVATION_RELEASED, payload);
  }

  settleReservation(reservationId: string, transactionId: string): void {
    const reservation = this._reservations.find(
      (r) => r.reservationId === reservationId
    );
    if (!reservation) {
      throw new ValidationError({ message: `Reservation ${reservationId} not found` });
    }
    const payload: ReservationSettledPayload = {
      walletId: this._id,
      reservationId,
      amount: reservation.amount,
      transactionId,
    };
    this.raise(WALLET_EVENT_TYPES.RESERVATION_SETTLED, payload);
  }

  freeze(reason: string): void {
    if (this._frozen) {
      throw new ValidationError({ message: "Wallet is already frozen" });
    }
    const payload: WalletFrozenPayload = { walletId: this._id, reason };
    this.raise(WALLET_EVENT_TYPES.WALLET_FROZEN, payload);
  }

  unfreeze(): void {
    if (!this._frozen) {
      throw new ValidationError({ message: "Wallet is not frozen" });
    }
    this.raise(WALLET_EVENT_TYPES.WALLET_UNFROZEN, { walletId: this._id });
  }

  apply(event: StoredEvent): void {
    switch (event.eventType) {
      case WALLET_EVENT_TYPES.WALLET_CREATED: {
        const p = event.payload as WalletCreatedPayload;
        this._id = p.walletId;
        this._organizationId = p.organizationId;
        this._currency = p.currency;
        this._balance = 0n;
        this._reservedAmount = 0n;
        this._reservations = [];
        this._frozen = false;
        break;
      }
      case WALLET_EVENT_TYPES.FUNDS_DEPOSITED: {
        const p = event.payload as FundsDepositedPayload;
        this._balance = this._balance + p.amount.baseUnits;
        break;
      }
      case WALLET_EVENT_TYPES.FUNDS_WITHDRAWN: {
        const p = event.payload as FundsWithdrawnPayload;
        this._balance = this._balance - p.amount.baseUnits;
        break;
      }
      case WALLET_EVENT_TYPES.FUNDS_RESERVED: {
        const p = event.payload as FundsReservedPayload;
        const amountBig = p.amount.baseUnits;
        this._reservedAmount = this._reservedAmount + amountBig;
        this._reservations = [
          ...this._reservations,
          { reservationId: p.reservationId, amount: p.amount, orderId: p.orderId },
        ];
        break;
      }
      case WALLET_EVENT_TYPES.RESERVATION_RELEASED: {
        const p = event.payload as ReservationReleasedPayload;
        const amountBig = p.amount.baseUnits;
        this._reservedAmount = this._reservedAmount - amountBig;
        this._reservations = this._reservations.filter(
          (r) => r.reservationId !== p.reservationId
        );
        break;
      }
      case WALLET_EVENT_TYPES.RESERVATION_SETTLED: {
        const p = event.payload as ReservationSettledPayload;
        const amountBig = p.amount.baseUnits;
        this._balance = this._balance - amountBig;
        this._reservedAmount = this._reservedAmount - amountBig;
        this._reservations = this._reservations.filter(
          (r) => r.reservationId !== p.reservationId
        );
        break;
      }
      case WALLET_EVENT_TYPES.WALLET_FROZEN: {
        this._frozen = true;
        break;
      }
      case WALLET_EVENT_TYPES.WALLET_UNFROZEN: {
        this._frozen = false;
        break;
      }
      default:
        break;
    }
  }
}
