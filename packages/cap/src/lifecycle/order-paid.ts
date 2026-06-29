// Handle ORDER_PAID CAP events: run verification and deliver the report to the buyer.

import { ok, err, isErr, epochToIso, systemClock, isObject, hasKey, isString, asId } from "@veritas/core";
import type { Result, AppError, Logger, OrderId } from "@veritas/core";
import { OrderSchema } from "@veritas/contracts";
import type { Order } from "@veritas/contracts";
import { runVerification } from "@veritas/verification";
import type { EngineOptions } from "@veritas/verification";
import { buildDelivery, summariseDelivery } from "../delivery-builder.js";
import { CapOrderError, CapDeliveryError } from "../errors.js";
import type { MetricsRecorder } from "../metrics.js";
import type { AgentClient } from "../client.js";
import type { PendingStore } from "../pending-store.js";

/** Raw payload arriving in an ORDER_PAID event. */
interface OrderPaidPayload {
  readonly order: Order;
  readonly txHash: string | null;
}

/** Result returned after handling an ORDER_PAID event. */
export interface OrderPaidResult {
  readonly orderId: string;
  readonly delivered: boolean;
  readonly contentHashHex: string;
  readonly durationMs: number;
  readonly handledAt: string;
}

/** Parse the raw ORDER_PAID event payload. */
function parseOrderPaidPayload(raw: unknown): Result<OrderPaidPayload, AppError> {
  if (!isObject(raw)) {
    return err(new CapOrderError("ORDER_PAID payload is not an object") as AppError);
  }
  const obj = raw as Record<string, unknown>;
  const orderParse = OrderSchema.safeParse(obj["order"]);
  if (!orderParse.success) {
    const msg = orderParse.error.issues.map((i) => i.message).join("; ");
    return err(new CapOrderError(`Invalid order in ORDER_PAID: ${msg}`) as AppError);
  }
  const txHash = hasKey(obj, "txHash") && isString(obj["txHash"]) ? obj["txHash"] : null;
  return ok({ order: orderParse.data, txHash });
}

/**
 * Handle an ORDER_PAID event.
 *
 * Looks up the pending requirements, runs the verification engine,
 * builds a deliverable, sends it back over CAP, and records metrics.
 */
export async function handleOrderPaid(
  rawPayload: unknown,
  client: AgentClient,
  pendingStore: PendingStore,
  engineOptions: EngineOptions,
  logger: Logger,
  metrics: MetricsRecorder,
): Promise<Result<OrderPaidResult, AppError>> {
  metrics.recordOrderReceived();

  const payloadResult = parseOrderPaidPayload(rawPayload);
  if (isErr(payloadResult)) {
    metrics.recordOrderFailed();
    return err(payloadResult.error);
  }

  const { order, txHash } = payloadResult.value;
  const orderId = asId<"Order">(order.id, "Order") as unknown as OrderId;
  const handledAt = epochToIso(systemClock.now());

  logger.info("cap:order-paid received", {
    orderId: order.id,
    buyerAgentId: order.buyerAgentId,
    txHash,
  });

  // Retrieve the pending order to get the parsed requirements.
  const pending = await pendingStore.get(orderId);
  if (pending === null) {
    const msg = `No pending requirements found for order ${order.id}`;
    logger.error("cap:order-paid missing pending entry", { orderId: order.id });
    metrics.recordOrderFailed();
    return err(new CapOrderError(msg, order.id) as AppError);
  }

  // Build the verification request from the stored requirements.
  const verificationRequest = {
    text: pending.requirements.text,
    claims: pending.requirements.claims ? [...pending.requirements.claims] : undefined,
    options: { effort: pending.requirements.effort, maxClaims: pending.requirements.maxClaims },
  };

  metrics.recordVerificationStarted();
  const startMs = Date.now();

  const verifyResult = await runVerification(verificationRequest, {
    ...engineOptions,
    effort: pending.requirements.effort,
    maxClaims: pending.requirements.maxClaims,
    logger,
  });

  if (isErr(verifyResult)) {
    metrics.recordVerificationFailed();
    metrics.recordOrderFailed();
    logger.error("cap:order-paid verification failed", {
      orderId: order.id,
      error: verifyResult.error.message,
    });
    await client.send({
      type: "ORDER_FAIL",
      payload: { orderId: order.id, reason: verifyResult.error.message },
    });
    return err(verifyResult.error);
  }

  metrics.recordVerificationSucceeded();
  const { report, durationMs } = verifyResult.value;

  // Build the deliverable envelope.
  const buildResult = buildDelivery(report, { durationMs });
  if (isErr(buildResult)) {
    metrics.recordDeliveryFailed();
    metrics.recordOrderFailed();
    logger.error("cap:order-paid delivery build failed", {
      orderId: order.id,
      error: buildResult.error.message,
    });
    return err(buildResult.error);
  }

  const built = buildResult.value;

  // Send the deliverable to the buyer via the relay.
  try {
    await client.send({
      type: "ORDER_DELIVER",
      payload: {
        orderId: order.id,
        deliverable: built.deliverable,
        contentHashHex: built.contentHashHex,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown delivery error";
    metrics.recordDeliveryFailed();
    metrics.recordOrderFailed();
    logger.error("cap:order-paid send failed", { orderId: order.id, error: msg });
    return err(new CapDeliveryError(msg, order.id) as AppError);
  }

  // Evict from pending store — order is fulfilled.
  pendingStore.remove(orderId);
  metrics.recordDeliverySent();
  metrics.recordOrderCompleted(BigInt(Math.round(parseFloat(pending.amountUsdc) * 1_000_000)));

  logger.info("cap:order-paid delivered", {
    orderId: order.id,
    summary: summariseDelivery(built),
  });

  return ok({
    orderId: order.id,
    delivered: true,
    contentHashHex: built.contentHashHex,
    durationMs,
    handledAt,
  });
}
