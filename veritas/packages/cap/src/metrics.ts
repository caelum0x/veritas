// CAP provider metrics tracking for negotiations, orders, and verifications.
import { Logger } from "@veritas/core";

export interface CapMetrics {
  negotiationsReceived: number;
  negotiationsAccepted: number;
  negotiationsRejected: number;
  ordersReceived: number;
  ordersCompleted: number;
  ordersFailed: number;
  ordersExpired: number;
  verificationsStarted: number;
  verificationsSucceeded: number;
  verificationsFailed: number;
  deliveriesSent: number;
  deliveriesFailed: number;
  reconnectAttempts: number;
  totalUsdcEarned: bigint;
}

export function makeCapMetrics(): CapMetrics {
  return {
    negotiationsReceived: 0,
    negotiationsAccepted: 0,
    negotiationsRejected: 0,
    ordersReceived: 0,
    ordersCompleted: 0,
    ordersFailed: 0,
    ordersExpired: 0,
    verificationsStarted: 0,
    verificationsSucceeded: 0,
    verificationsFailed: 0,
    deliveriesSent: 0,
    deliveriesFailed: 0,
    reconnectAttempts: 0,
    totalUsdcEarned: 0n,
  };
}

export interface MetricsRecorder {
  recordNegotiationReceived(): void;
  recordNegotiationAccepted(): void;
  recordNegotiationRejected(): void;
  recordOrderReceived(): void;
  recordOrderCompleted(usdcAmount: bigint): void;
  recordOrderFailed(): void;
  recordOrderExpired(): void;
  recordVerificationStarted(): void;
  recordVerificationSucceeded(): void;
  recordVerificationFailed(): void;
  recordDeliverySent(): void;
  recordDeliveryFailed(): void;
  recordReconnectAttempt(): void;
  snapshot(): Readonly<CapMetrics>;
}

export function makeMetricsRecorder(logger: Logger): MetricsRecorder {
  const m = makeCapMetrics();

  function log(event: string, extra?: Record<string, unknown>): void {
    logger.info(`[cap:metrics] ${event}`, extra ?? {});
  }

  return {
    recordNegotiationReceived(): void {
      m.negotiationsReceived++;
      log("negotiation_received", { total: m.negotiationsReceived });
    },
    recordNegotiationAccepted(): void {
      m.negotiationsAccepted++;
      log("negotiation_accepted", { total: m.negotiationsAccepted });
    },
    recordNegotiationRejected(): void {
      m.negotiationsRejected++;
      log("negotiation_rejected", { total: m.negotiationsRejected });
    },
    recordOrderReceived(): void {
      m.ordersReceived++;
      log("order_received", { total: m.ordersReceived });
    },
    recordOrderCompleted(usdcAmount: bigint): void {
      m.ordersCompleted++;
      m.totalUsdcEarned += usdcAmount;
      log("order_completed", {
        total: m.ordersCompleted,
        usdcAmount: usdcAmount.toString(),
        totalEarned: m.totalUsdcEarned.toString(),
      });
    },
    recordOrderFailed(): void {
      m.ordersFailed++;
      log("order_failed", { total: m.ordersFailed });
    },
    recordOrderExpired(): void {
      m.ordersExpired++;
      log("order_expired", { total: m.ordersExpired });
    },
    recordVerificationStarted(): void {
      m.verificationsStarted++;
      log("verification_started", { total: m.verificationsStarted });
    },
    recordVerificationSucceeded(): void {
      m.verificationsSucceeded++;
      log("verification_succeeded", { total: m.verificationsSucceeded });
    },
    recordVerificationFailed(): void {
      m.verificationsFailed++;
      log("verification_failed", { total: m.verificationsFailed });
    },
    recordDeliverySent(): void {
      m.deliveriesSent++;
      log("delivery_sent", { total: m.deliveriesSent });
    },
    recordDeliveryFailed(): void {
      m.deliveriesFailed++;
      log("delivery_failed", { total: m.deliveriesFailed });
    },
    recordReconnectAttempt(): void {
      m.reconnectAttempts++;
      log("reconnect_attempt", { total: m.reconnectAttempts });
    },
    snapshot(): Readonly<CapMetrics> {
      return { ...m };
    },
  };
}
