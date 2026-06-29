// CAP-specific error classes extending AppError for all lifecycle failure modes.

import { AppError, type AppErrorOptions } from "@veritas/core";

/** Raised when a CAP negotiation payload cannot be parsed or fails policy. */
export class CapNegotiationError extends AppError {
  readonly capCode = "CAP_NEGOTIATION_ERROR" as const;
  constructor(
    message: string,
    public readonly negotiationId?: string,
    options: AppErrorOptions = {},
  ) {
    super("INTERNAL", 422, "CAP negotiation error", { ...options, message });
    this.name = "CapNegotiationError";
  }
}

/** Raised when the CAP order cannot be fulfilled (e.g. verification failed). */
export class CapOrderError extends AppError {
  readonly capCode = "CAP_ORDER_ERROR" as const;
  constructor(
    message: string,
    public readonly orderId?: string,
    options: AppErrorOptions = {},
  ) {
    super("INTERNAL", 422, "CAP order error", { ...options, message });
    this.name = "CapOrderError";
  }
}

/** Raised when the agent WebSocket connection cannot be established or drops. */
export class CapConnectionError extends AppError {
  readonly capCode = "CAP_CONNECTION_ERROR" as const;
  constructor(
    message: string,
    public readonly endpoint?: string,
    options: AppErrorOptions = {},
  ) {
    super("UNAVAILABLE", 503, "CAP connection error", { ...options, message });
    this.name = "CapConnectionError";
  }
}

/** Raised when the pricing policy rejects an offered USDC amount. */
export class CapPricingError extends AppError {
  readonly capCode = "CAP_PRICING_ERROR" as const;
  constructor(message: string, options: AppErrorOptions = {}) {
    super("VALIDATION", 400, "CAP pricing error", { ...options, message });
    this.name = "CapPricingError";
  }
}

/** Raised when building or sending a delivery to the buyer fails. */
export class CapDeliveryError extends AppError {
  readonly capCode = "CAP_DELIVERY_ERROR" as const;
  constructor(
    message: string,
    public readonly orderId?: string,
    options: AppErrorOptions = {},
  ) {
    super("INTERNAL", 500, "CAP delivery error", { ...options, message });
    this.name = "CapDeliveryError";
  }
}

/** Raised when settlement bookkeeping cannot be recorded. */
export class CapSettlementError extends AppError {
  readonly capCode = "CAP_SETTLEMENT_ERROR" as const;
  constructor(
    message: string,
    public readonly orderId?: string,
    options: AppErrorOptions = {},
  ) {
    super("INTERNAL", 500, "CAP settlement error", { ...options, message });
    this.name = "CapSettlementError";
  }
}

/** Raised when a CAP requirements payload fails runtime validation. */
export class CapParseError extends AppError {
  readonly capCode = "CAP_PARSE_ERROR" as const;
  constructor(
    message: string,
    public readonly field?: string,
    options: AppErrorOptions = {},
  ) {
    super("VALIDATION", 400, "CAP parse error", { ...options, message });
    this.name = "CapParseError";
  }
}
