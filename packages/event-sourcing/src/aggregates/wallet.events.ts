// Domain events for the Wallet aggregate.
import type { Usdc } from "@veritas/core";
import type { TransactionKind } from "@veritas/contracts";

export const WALLET_EVENT_TYPES = {
  WALLET_CREATED: "wallet.created",
  FUNDS_DEPOSITED: "wallet.funds_deposited",
  FUNDS_WITHDRAWN: "wallet.funds_withdrawn",
  FUNDS_RESERVED: "wallet.funds_reserved",
  RESERVATION_RELEASED: "wallet.reservation_released",
  RESERVATION_SETTLED: "wallet.reservation_settled",
  WALLET_FROZEN: "wallet.frozen",
  WALLET_UNFROZEN: "wallet.unfrozen",
} as const;

export type WalletEventType =
  (typeof WALLET_EVENT_TYPES)[keyof typeof WALLET_EVENT_TYPES];

export interface WalletCreatedPayload {
  readonly walletId: string;
  readonly organizationId: string;
  readonly currency: string;
}

export interface FundsDepositedPayload {
  readonly walletId: string;
  readonly amount: Usdc;
  readonly transactionId: string;
  readonly kind: TransactionKind;
  readonly reference?: string;
}

export interface FundsWithdrawnPayload {
  readonly walletId: string;
  readonly amount: Usdc;
  readonly transactionId: string;
  readonly kind: TransactionKind;
  readonly reference?: string;
}

export interface FundsReservedPayload {
  readonly walletId: string;
  readonly reservationId: string;
  readonly amount: Usdc;
  readonly orderId: string;
}

export interface ReservationReleasedPayload {
  readonly walletId: string;
  readonly reservationId: string;
  readonly amount: Usdc;
}

export interface ReservationSettledPayload {
  readonly walletId: string;
  readonly reservationId: string;
  readonly amount: Usdc;
  readonly transactionId: string;
}

export interface WalletFrozenPayload {
  readonly walletId: string;
  readonly reason: string;
}

export interface WalletUnfrozenPayload {
  readonly walletId: string;
}

export type WalletEventPayload =
  | WalletCreatedPayload
  | FundsDepositedPayload
  | FundsWithdrawnPayload
  | FundsReservedPayload
  | ReservationReleasedPayload
  | ReservationSettledPayload
  | WalletFrozenPayload
  | WalletUnfrozenPayload;
