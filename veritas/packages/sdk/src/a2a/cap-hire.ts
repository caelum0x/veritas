// High-level A2A helper: hire Veritas via CAP, settle USDC, await delivery.
import { newId } from "@veritas/core";
import { CapHireError } from "../errors.js";
import { waitForCompletion } from "./wait-for-completion.js";
import { tryReadReport } from "./report-reader.js";
import type { CapHireOptions, HireResult, Order, Delivery } from "../types.js";
import type { Transport } from "../http/transport.js";
import { parseResponse } from "../http/response.js";

/** Minimal order-creation payload for the CAP hire endpoint. */
interface CreateOrderBody {
  serviceId: string;
  claim: string;
  amountUsdc: string;
  buyerAddress: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

/** Fetches an Order by ID using the supplied transport. */
async function getOrder(transport: Transport, orderId: string): Promise<Order> {
  const result = await transport.request({
    method: "GET",
    path: `/orders/${orderId}`,
  });

  if (!result.ok) throw result.error;

  const parsed = parseResponse<Order>(result.value);
  if (!parsed.ok) throw parsed.error;

  return parsed.value;
}

/** Fetches the Delivery for a completed order, or null if absent. */
async function getDelivery(
  transport: Transport,
  orderId: string,
): Promise<Delivery | null> {
  const result = await transport.request({
    method: "GET",
    path: `/orders/${orderId}/delivery`,
  });

  if (!result.ok) {
    // 404 is acceptable — the delivery may not exist yet
    if (result.error.code === "not_found") return null;
    throw result.error;
  }

  const parsed = parseResponse<Delivery>(result.value);
  if (!parsed.ok) throw parsed.error;

  return parsed.value;
}

/**
 * Hire Veritas over CAP in a single call:
 *  1. Create an order on the `/orders` endpoint (with idempotency key).
 *  2. Poll until the order reaches a terminal status.
 *  3. Fetch the delivery and parse the VerificationReport from the payload.
 *
 * Throws CapHireError on any unrecoverable failure, or
 * WaitForCompletionTimeoutError if polling times out.
 */
export async function capHire(
  transport: Transport,
  opts: CapHireOptions,
): Promise<HireResult> {
  const idempotencyKey = `cap-hire-${newId("sdk")}`;

  const body: CreateOrderBody = {
    serviceId: opts.serviceId,
    claim: opts.claim,
    amountUsdc: opts.amountUsdc,
    buyerAddress: opts.buyerAddress,
    idempotencyKey,
    ...(opts.metadata ? { metadata: opts.metadata } : {}),
  };

  // Step 1: Create the order.
  const createResult = await transport.request({
    method: "POST",
    path: "/orders",
    body,
    idempotencyKey,
  });

  if (!createResult.ok) {
    throw new CapHireError(
      `Failed to create CAP order: ${createResult.error.message}`,
      createResult.error,
    );
  }

  const parsedOrder = parseResponse<Order>(createResult.value);
  if (!parsedOrder.ok) {
    throw new CapHireError(
      `Failed to parse order response: ${parsedOrder.error.message}`,
      parsedOrder.error,
    );
  }

  const initialOrder = parsedOrder.value;

  // Step 2: Poll until terminal.
  let finalOrder: Order;
  try {
    finalOrder = await waitForCompletion(
      initialOrder.id,
      (id) => getOrder(transport, id),
      opts.completion,
    );
  } catch (err: unknown) {
    throw err; // propagate WaitForCompletionTimeoutError as-is
  }

  // Step 3: Fetch delivery and parse report.
  let delivery: Delivery | null = null;
  try {
    delivery = await getDelivery(transport, finalOrder.id);
  } catch (err: unknown) {
    throw new CapHireError(
      `Failed to fetch delivery for order ${finalOrder.id}`,
      err,
    );
  }

  const report = delivery !== null ? tryReadReport(delivery) : null;

  return { order: finalOrder, delivery, report };
}
