// Bridge A2A task requests into CROO CAP (Commerce Agent Protocol) orders and vice-versa.

import { z } from "zod";
import { ok, err, type Result } from "@veritas/core";
import type { A2AAgentCard } from "./agent-card.js";
import type { A2AMessage } from "./message.js";
import { A2ACapBridgeError } from "./errors.js";
import { type A2AMetadata } from "./types.js";

// ---------------------------------------------------------------------------
// CAP-side request/response shapes (minimal — no @veritas/cap dependency)
// ---------------------------------------------------------------------------

/** Minimal CAP negotiation request produced by the bridge. */
export interface CapNegotiationRequest {
  readonly buyerAgentId: string;
  readonly buyerEndpoint: string;
  readonly requirementsText: string;
  readonly maxBudgetUsdc: string;
  readonly callbackUrl?: string;
  readonly metadata?: A2AMetadata;
}

/** Minimal CAP negotiation response received by the bridge. */
export const CapNegotiationResponseSchema = z.object({
  accepted: z.boolean(),
  orderId: z.string().optional(),
  counterOffer: z.string().optional(),
  reason: z.string().optional(),
});
export type CapNegotiationResponse = z.infer<typeof CapNegotiationResponseSchema>;

/** CAP delivery payload echoed back as an A2A artifact. */
export const CapDeliverySchema = z.object({
  orderId: z.string().min(1),
  schema: z.string(),
  payload: z.unknown(),
  deliveredAt: z.string().datetime({ offset: true }),
});
export type CapDelivery = z.infer<typeof CapDeliverySchema>;

// ---------------------------------------------------------------------------
// Bridge types
// ---------------------------------------------------------------------------

/** Configuration for the CAP bridge. */
export interface CapBridgeConfig {
  /** The Veritas agent card used when placing outbound CAP orders. */
  readonly selfCard: A2AAgentCard;
  /** Maximum USDC budget (as integer string in base units) per bridged order. */
  readonly maxBudgetUsdc: string;
  /** CAP provider base URL to send negotiation requests to. */
  readonly capEndpoint: string;
}

/** Outbound: translate an A2A task request message into a CAP negotiation. */
export function a2aMessageToCapNegotiation(
  message: A2AMessage,
  config: CapBridgeConfig
): Result<CapNegotiationRequest> {
  const textPart = message.parts.find((p) => p.kind === "text");
  if (!textPart || textPart.kind !== "text") {
    return err(
      new A2ACapBridgeError(
        "A2A message must contain at least one text part to bridge to CAP"
      )
    );
  }

  const request: CapNegotiationRequest = {
    buyerAgentId: config.selfCard.agentId,
    buyerEndpoint: config.selfCard.endpoint,
    requirementsText: textPart.text,
    maxBudgetUsdc: config.maxBudgetUsdc,
    metadata: message.metadata,
  };

  return ok(request);
}

/** Inbound: translate a CAP delivery into a structured A2A result payload. */
export function capDeliveryToA2AResult(
  raw: unknown
): Result<CapDelivery> {
  const parsed = CapDeliverySchema.safeParse(raw);
  if (!parsed.success) {
    return err(
      new A2ACapBridgeError(
        `Invalid CAP delivery payload: ${parsed.error.message}`
      )
    );
  }
  return ok(parsed.data);
}

/** Parse and validate a raw CAP negotiation response from the wire. */
export function parseCapNegotiationResponse(
  raw: unknown
): Result<CapNegotiationResponse> {
  const parsed = CapNegotiationResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return err(
      new A2ACapBridgeError(
        `Invalid CAP negotiation response: ${parsed.error.message}`
      )
    );
  }
  return ok(parsed.data);
}

/** Build the JSON body for sending a CAP negotiation HTTP request. */
export function buildCapNegotiationBody(
  req: CapNegotiationRequest
): Readonly<Record<string, unknown>> {
  return {
    buyerAgentId: req.buyerAgentId,
    buyerEndpoint: req.buyerEndpoint,
    requirementsText: req.requirementsText,
    maxBudgetUsdc: req.maxBudgetUsdc,
    ...(req.callbackUrl !== undefined && { callbackUrl: req.callbackUrl }),
    ...(req.metadata !== undefined && { metadata: req.metadata }),
  };
}
