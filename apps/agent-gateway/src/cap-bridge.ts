// Bridge between gateway A2A task messages and the CROO CAP provider via HTTP.

import {
  ok,
  err,
  type Result,
  withTimeout,
  safeParseJson,
} from "@veritas/core";
import {
  a2aMessageToCapNegotiation,
  capDeliveryToA2AResult,
  parseCapNegotiationResponse,
  buildCapNegotiationBody,
  type CapBridgeConfig,
  type CapNegotiationResponse,
  type CapDelivery,
} from "@veritas/a2a-protocol";
import type { A2AMessage } from "@veritas/a2a-protocol";
import { GatewayCapError } from "./errors.js";

/** Options for a single CAP bridge call. */
export interface CapBridgeCallOptions {
  readonly timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Send an A2A message to a CAP provider as a negotiation request and return
 * the parsed negotiation response.
 */
export async function negotiateViaCap(
  message: A2AMessage,
  config: CapBridgeConfig,
  opts: CapBridgeCallOptions = {}
): Promise<Result<CapNegotiationResponse>> {
  const negotiationResult = a2aMessageToCapNegotiation(message, config);
  if (!negotiationResult.ok) {
    return err(new GatewayCapError("Failed to translate A2A message to CAP negotiation", {
      cause: negotiationResult.error,
    }));
  }

  const body = buildCapNegotiationBody(negotiationResult.value);
  const url = `${config.capEndpoint}/negotiations`;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let responseText: string;
  try {
    const raw = await withTimeout(
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      timeoutMs
    );
    if (!raw.ok) {
      const text = await raw.text().catch(() => "");
      return err(new GatewayCapError(`CAP provider returned HTTP ${raw.status}: ${text}`));
    }
    responseText = await raw.text();
  } catch (cause) {
    return err(new GatewayCapError("CAP negotiation HTTP request failed", { cause }));
  }

  const jsonResult = safeParseJson(responseText);
  if (!jsonResult.ok) {
    return err(new GatewayCapError("CAP negotiation response is not valid JSON", {
      cause: jsonResult.error,
    }));
  }

  return parseCapNegotiationResponse(jsonResult.value);
}

/**
 * Fetch a CAP delivery by orderId and translate it to an A2A-compatible result.
 */
export async function fetchCapDelivery(
  orderId: string,
  capEndpoint: string,
  opts: CapBridgeCallOptions = {}
): Promise<Result<CapDelivery>> {
  const url = `${capEndpoint}/orders/${encodeURIComponent(orderId)}/delivery`;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let responseText: string;
  try {
    const raw = await withTimeout(
      fetch(url, { method: "GET" }),
      timeoutMs
    );
    if (!raw.ok) {
      const text = await raw.text().catch(() => "");
      return err(new GatewayCapError(`CAP delivery fetch returned HTTP ${raw.status}: ${text}`));
    }
    responseText = await raw.text();
  } catch (cause) {
    return err(new GatewayCapError("CAP delivery HTTP request failed", { cause }));
  }

  const jsonResult = safeParseJson(responseText);
  if (!jsonResult.ok) {
    return err(new GatewayCapError("CAP delivery response is not valid JSON", {
      cause: jsonResult.error,
    }));
  }

  return capDeliveryToA2AResult(jsonResult.value);
}

/** Bound CAP bridge scoped to a single CapBridgeConfig. */
export interface CapBridge {
  negotiate(message: A2AMessage, opts?: CapBridgeCallOptions): Promise<Result<CapNegotiationResponse>>;
  fetchDelivery(orderId: string, opts?: CapBridgeCallOptions): Promise<Result<CapDelivery>>;
}

/** Create a CapBridge instance bound to the given config. */
export function createCapBridge(config: CapBridgeConfig): CapBridge {
  return {
    negotiate: (message, opts) => negotiateViaCap(message, config, opts),
    fetchDelivery: (orderId, opts) => fetchCapDelivery(orderId, config.capEndpoint, opts),
  };
}
