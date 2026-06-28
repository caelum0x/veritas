// Registers billing services (metering, quota, invoicing, reconciliation) into the DI container.

import type { Container } from "../container.js";
import type { Token } from "../tokens.js";
import { LOGGER } from "../tokens.js";
import { MeteringService } from "@veritas/billing";
import { InvoiceGenerator } from "@veritas/billing";
import { Ledger } from "@veritas/billing";
import { QuotaEnforcer } from "@veritas/billing/quota.js";
import { SettlementReconciler } from "@veritas/billing/settlement-reconciler.js";
import { noopLogger } from "@veritas/core";
import type { Logger, EventBus } from "@veritas/core";

/** Create a local token for a billing-layer service. */
function billingToken<T>(name: string): Token<T> {
  return Symbol(name) as Token<T>;
}

/** Local DI tokens for billing subsystems not present in the global token map. */
export const BILLING_LEDGER_TOKEN          = billingToken<Ledger>("BillingLedger");
export const METERING_SERVICE_TOKEN        = billingToken<MeteringService>("MeteringService");
export const QUOTA_ENFORCER_TOKEN          = billingToken<QuotaEnforcer>("QuotaEnforcer");
export const INVOICE_GENERATOR_TOKEN       = billingToken<InvoiceGenerator>("InvoiceGenerator");
export const SETTLEMENT_RECONCILER_TOKEN   = billingToken<SettlementReconciler>("SettlementReconciler");
export const EVENT_BUS_TOKEN               = billingToken<EventBus>("EventBus");

/** Safely resolve an optional dependency — returns null when the token is not registered. */
function tryResolve<T>(c: Container, tok: Token<T>): T | null {
  return c.has(tok) ? c.resolve<T>(tok) : null;
}

/**
 * Wire all billing subsystems.
 * Depends on LOGGER and optionally EVENT_BUS_TOKEN for metering event emission.
 */
export function registerBillingModule(container: Container): void {
  // Append-only monetary ledger — shared across invoicing and reconciliation.
  container.singleton(BILLING_LEDGER_TOKEN, (c): Ledger => {
    const logger = tryResolve<Logger>(c, LOGGER) ?? noopLogger;
    return new Ledger({ logger });
  });

  // Metering service — records usage events and optionally publishes domain events.
  container.singleton(METERING_SERVICE_TOKEN, (c): MeteringService => {
    const logger = tryResolve<Logger>(c, LOGGER) ?? noopLogger;
    const eventBus = tryResolve<EventBus>(c, EVENT_BUS_TOKEN);
    return new MeteringService({ logger, eventBus: eventBus ?? undefined });
  });

  // Quota enforcer — stateless; evaluates plan limits against aggregated usage.
  container.singleton(QUOTA_ENFORCER_TOKEN, (c): QuotaEnforcer => {
    const logger = tryResolve<Logger>(c, LOGGER) ?? noopLogger;
    return new QuotaEnforcer({ logger });
  });

  // Invoice generator — produces invoice records from plan charges and usage.
  container.singleton(INVOICE_GENERATOR_TOKEN, (c): InvoiceGenerator => {
    const logger = tryResolve<Logger>(c, LOGGER) ?? noopLogger;
    return new InvoiceGenerator({ logger });
  });

  // Settlement reconciler — matches on-chain USDC payments against expected amounts.
  container.singleton(SETTLEMENT_RECONCILER_TOKEN, (c): SettlementReconciler => {
    const ledger = c.resolve<Ledger>(BILLING_LEDGER_TOKEN);
    const logger = tryResolve<Logger>(c, LOGGER) ?? noopLogger;
    return new SettlementReconciler({ ledger, logger });
  });
}
