// Deps bundle: port interfaces and dependency types for all commerce flows.

import type { Logger, EventBus } from "@veritas/core";
import type { UsageMeter, MeterOptions } from "@veritas/usage-billing";
import type { Ledger } from "@veritas/billing";
import type { PaymentProcessor, PaymentStore } from "@veritas/payments";
import type { DunningOptions } from "@veritas/dunning";

/** Shared infrastructure ports available to all commerce flows. */
export interface CommerceDeps {
  readonly logger: Logger;
  readonly eventBus: EventBus;
}

/** Ports required by the meter-usage flow. */
export interface MeterUsageDeps extends CommerceDeps {
  readonly usageMeter: UsageMeter;
}

/** Ports required by the subscribe-and-bill flow. */
export interface SubscribeAndBillDeps extends CommerceDeps {
  readonly ledger: Ledger;
}

/** Ports required by the charge-and-receipt flow. */
export interface ChargeAndReceiptDeps extends CommerceDeps {
  readonly processor: PaymentProcessor;
  readonly paymentStore: PaymentStore;
  readonly ledger: Ledger;
}

/** Ports required by the refund-and-credit flow. */
export interface RefundAndCreditDeps extends CommerceDeps {
  readonly processor: PaymentProcessor;
  readonly paymentStore: PaymentStore;
  readonly ledger: Ledger;
}

/** Ports required by the dunning flow. */
export interface DunningDeps extends CommerceDeps {
  readonly processor: PaymentProcessor;
  readonly paymentStore: PaymentStore;
  readonly dunningOptions?: DunningOptions;
}

/** Ports required by the hire-and-settle flow. */
export interface HireAndSettleDeps extends CommerceDeps {
  readonly processor: PaymentProcessor;
  readonly paymentStore: PaymentStore;
  readonly ledger: Ledger;
  readonly usageMeter: UsageMeter;
}
