// VeritasProvider: the main CAP event loop that wires client, router, and lifecycle handlers.

import { noopLogger, asId, epochToIso, systemClock, isOk } from "@veritas/core";
import type { Logger, OrderId, UserId } from "@veritas/core";
import type { EngineOptions } from "@veritas/verification";
import { createAgentClient } from "./client.js";
import type { AgentClient } from "./client.js";
import { attachEventRouter, buildRegistry } from "./event-router.js";
import type { CapEvent } from "./event-router.js";
import { makeMetricsRecorder } from "./metrics.js";
import type { MetricsRecorder } from "./metrics.js";
import { makePendingStore } from "./pending-store.js";
import type { PendingStore } from "./pending-store.js";
import { makeReconnectManager } from "./reconnect.js";
import type { ReconnectOptions } from "./reconnect.js";
import { makeSettlementLedger } from "./settlement.js";
import type { SettlementLedger } from "./settlement.js";
import { handleNegotiationCreated } from "./lifecycle/negotiation-created.js";
import { handleOrderPaid } from "./lifecycle/order-paid.js";
import { handleOrderCompleted } from "./lifecycle/order-completed.js";
import { handleOrderRejected } from "./lifecycle/order-rejected.js";
import { handleOrderExpired } from "./lifecycle/order-expired.js";
import type { CapProviderConfig, PendingOrder } from "./types.js";
import type { NegotiationPolicyConfig } from "./negotiation-policy.js";

/** Options for constructing a VeritasProvider. */
export interface VeritasProviderOptions {
  readonly config: CapProviderConfig;
  readonly engineOptions: EngineOptions;
  readonly policyConfig?: NegotiationPolicyConfig;
  readonly reconnectOptions?: ReconnectOptions;
  readonly logger?: Logger;
}

/** Runtime state of the provider. */
type ProviderState = "idle" | "running" | "stopped";

/** The Veritas CAP provider — connects to the relay and handles the full order lifecycle. */
export interface VeritasProvider {
  /** Start the provider event loop. Resolves when the loop exits. */
  start(): Promise<void>;
  /** Gracefully stop the provider and close the connection. */
  stop(): Promise<void>;
  /** Current run state. */
  readonly state: ProviderState;
  /** Access accumulated metrics. */
  readonly metrics: MetricsRecorder;
  /** Access the settlement ledger. */
  readonly settlements: SettlementLedger;
}

/**
 * Create and wire a full VeritasProvider instance.
 * Call `.start()` to begin the event loop.
 */
export function createVeritasProvider(options: VeritasProviderOptions): VeritasProvider {
  const logger: Logger = options.logger ?? noopLogger;
  const metricsRecorder = makeMetricsRecorder(logger);
  const pendingStore: PendingStore = makePendingStore(logger);
  const settlementLedger: SettlementLedger = makeSettlementLedger(logger);
  const reconnectManager = makeReconnectManager(options.reconnectOptions, logger);

  const client: AgentClient = createAgentClient(options.config, logger);

  let state: ProviderState = "idle";
  let stopRequested = false;
  let detachRouter: (() => void) | null = null;
  let detachClose: (() => void) | null = null;

  function buildHandlerRegistry() {
    return buildRegistry({
      NEGOTIATION_CREATED: async (event: CapEvent) => {
        const result = await handleNegotiationCreated(
          event.payload,
          client,
          logger,
          metricsRecorder,
          options.policyConfig,
        );
        if (isOk(result) && result.value.accepted && result.value.parsedRequirements) {
          // The negotiation was accepted — the order payload will carry the orderId
          // when ORDER_PAID arrives. We pre-cache a skeleton pending entry keyed on
          // negotiationId so it can be updated when the order is confirmed.
          logger.debug("cap:provider negotiation accepted, awaiting ORDER_PAID", {
            negotiationId: result.value.negotiationId,
          });
        }
      },

      ORDER_PAID: async (event: CapEvent) => {
        // On ORDER_PAID, cache requirements from the event if not already present.
        const payload = event.payload as Record<string, unknown> | null;
        if (payload && typeof payload === "object") {
          const orderId = payload["orderId"];
          const buyerAgentId = payload["buyerAgentId"];
          const requirements = payload["requirements"];
          const amountUsdc = payload["amountUsdc"];

          if (
            typeof orderId === "string" &&
            typeof buyerAgentId === "string" &&
            typeof amountUsdc === "string" &&
            requirements !== undefined
          ) {
            // Import parseRequirements inline to keep the pending store warm.
            const { parseRequirements } = await import("./request-parser.js");
            const parsed = parseRequirements(requirements);
            if (isOk(parsed)) {
              const pending: PendingOrder = {
                orderId: asId<"Order">(orderId, "Order") as unknown as OrderId,
                buyerId: asId<"User">(buyerAgentId, "User") as unknown as UserId,
                requirements: parsed.value,
                createdAt: epochToIso(systemClock.now()),
                amountUsdc,
              };
              pendingStore.put(pending);
            }
          }
        }

        await handleOrderPaid(
          event.payload,
          client,
          pendingStore,
          options.engineOptions,
          logger,
          metricsRecorder,
        );
      },

      ORDER_COMPLETED: async (event: CapEvent) => {
        const p = event.payload as Record<string, unknown> | null;
        if (!p || typeof p !== "object") return;
        const order = p["order"];
        const settlement = p["settlement"];
        const deliveredAt = typeof p["deliveredAt"] === "string"
          ? p["deliveredAt"]
          : epochToIso(systemClock.now());

        if (order && settlement) {
          await handleOrderCompleted(
            { order: order as never, settlement: settlement as never, deliveredAt },
            logger,
          );
          // Record in the local ledger using settlement data.
          const s = settlement as Record<string, unknown>;
          settlementLedger.record({
            orderId: asId<"Order">(String((order as Record<string, unknown>)["id"]), "Order") as unknown as OrderId,
            amountUsdc: typeof s["amount"] === "string" ? s["amount"] : "0",
            txHash: typeof s["txHash"] === "string" ? s["txHash"] : null,
            notes: `Settled via CAP relay at ${deliveredAt}`,
          });
        }
      },

      ORDER_REJECTED: async (event: CapEvent) => {
        const p = event.payload as Record<string, unknown> | null;
        if (!p || typeof p !== "object") return;
        const order = p["order"];
        const reason = typeof p["reason"] === "string" ? p["reason"] : "Rejected by buyer";
        if (order) {
          await handleOrderRejected(
            { order: order as never, reason },
            logger,
            async (orderId) => {
              pendingStore.remove(asId<"Order">(orderId, "Order") as unknown as OrderId);
            },
          );
          metricsRecorder.recordOrderFailed();
        }
      },

      ORDER_EXPIRED: async (event: CapEvent) => {
        const p = event.payload as Record<string, unknown> | null;
        if (!p || typeof p !== "object") return;
        const order = p["order"];
        const expiredAt = typeof p["expiredAt"] === "string"
          ? p["expiredAt"]
          : epochToIso(systemClock.now());
        if (order) {
          await handleOrderExpired(
            { order: order as never, expiredAt },
            logger,
            async (orderId) => {
              pendingStore.remove(asId<"Order">(orderId, "Order") as unknown as OrderId);
            },
          );
          metricsRecorder.recordOrderExpired();
        }
      },
    });
  }

  async function connect(): Promise<void> {
    const registry = buildHandlerRegistry();
    await client.connect();
    reconnectManager.reset();

    detachRouter = attachEventRouter(client, registry, logger);

    detachClose = client.onClose(async (code, reason) => {
      logger.warn("cap:provider connection closed", { code, reason });
      if (!stopRequested) {
        await attemptReconnect();
      }
    });
  }

  async function attemptReconnect(): Promise<void> {
    if (detachRouter) { detachRouter(); detachRouter = null; }
    if (detachClose) { detachClose(); detachClose = null; }

    while (!stopRequested && !reconnectManager.exhausted) {
      try {
        metricsRecorder.recordReconnectAttempt();
        await reconnectManager.waitForNext();
        logger.info("cap:provider attempting reconnect", { attempt: reconnectManager.attempts });
        await connect();
        logger.info("cap:provider reconnected successfully");
        return;
      } catch {
        // waitForNext throws CapConnectionError when exhausted — will exit the loop.
      }
    }

    if (!stopRequested) {
      logger.error("cap:provider reconnect exhausted — stopping", {
        attempts: reconnectManager.attempts,
      });
      state = "stopped";
    }
  }

  return {
    get state() {
      return state;
    },
    get metrics() {
      return metricsRecorder;
    },
    get settlements() {
      return settlementLedger;
    },

    async start(): Promise<void> {
      if (state !== "idle") return;
      state = "running";
      stopRequested = false;

      logger.info("cap:provider starting", {
        agentId: options.config.agentId,
        agentUrl: options.config.agentUrl,
      });

      await connect();

      logger.info("cap:provider running", { pendingOrders: pendingStore.size() });
    },

    async stop(): Promise<void> {
      if (state === "stopped") return;
      stopRequested = true;
      state = "stopped";

      if (detachRouter) { detachRouter(); detachRouter = null; }
      if (detachClose) { detachClose(); detachClose = null; }

      await client.close();
      logger.info("cap:provider stopped", { metrics: metricsRecorder.snapshot() });
    },
  };
}
