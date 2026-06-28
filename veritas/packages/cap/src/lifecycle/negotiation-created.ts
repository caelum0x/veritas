// Handle NEGOTIATION_CREATED CAP events: validate, apply policy, accept or reject.

import { ok, err, isErr, epochToIso, systemClock, isObject, hasKey, isString } from "@veritas/core";
import type { Result, AppError, Logger } from "@veritas/core";
import type { Negotiation } from "@veritas/contracts";
import { NegotiationSchema } from "@veritas/contracts";
import { parseRequirements } from "../request-parser.js";
import { evaluateNegotiation } from "../negotiation-policy.js";
import type { NegotiationPolicyConfig } from "../negotiation-policy.js";
import type { ParsedRequirements } from "../types.js";
import { CapNegotiationError } from "../errors.js";
import type { MetricsRecorder } from "../metrics.js";
import type { AgentClient } from "../client.js";

/** Raw payload arriving in a NEGOTIATION_CREATED event. */
interface NegotiationCreatedPayload {
  readonly negotiation: Negotiation;
  readonly requirements: unknown;
  readonly offeredAmountUsdc: string;
}

/** Outcome returned after handling the event. */
export interface NegotiationHandledResult {
  readonly negotiationId: string;
  readonly accepted: boolean;
  readonly reason: string;
  readonly parsedRequirements?: ParsedRequirements;
  readonly handledAt: string;
}

/** Parse the raw event payload into a typed NegotiationCreatedPayload. */
function parsePayload(
  raw: unknown,
): Result<NegotiationCreatedPayload, AppError> {
  if (!isObject(raw)) {
    return err(new CapNegotiationError("Negotiation payload is not an object") as AppError);
  }

  const obj = raw as Record<string, unknown>;

  const negotiationParse = NegotiationSchema.safeParse(obj["negotiation"]);
  if (!negotiationParse.success) {
    const msg = negotiationParse.error.issues.map((i) => i.message).join("; ");
    return err(new CapNegotiationError(`Invalid negotiation object: ${msg}`) as AppError);
  }

  if (!hasKey(obj, "offeredAmountUsdc") || !isString(obj["offeredAmountUsdc"])) {
    return err(new CapNegotiationError("Missing or invalid offeredAmountUsdc") as AppError);
  }

  return ok({
    negotiation: negotiationParse.data,
    requirements: obj["requirements"],
    offeredAmountUsdc: obj["offeredAmountUsdc"] as string,
  });
}

/**
 * Handle a NEGOTIATION_CREATED event.
 *
 * Validates the payload, applies the pricing + policy rules, then sends
 * ACCEPT or REJECT back to the buyer via the AgentClient.
 */
export async function handleNegotiationCreated(
  rawPayload: unknown,
  client: AgentClient,
  logger: Logger,
  metrics: MetricsRecorder,
  policyConfig?: NegotiationPolicyConfig,
): Promise<Result<NegotiationHandledResult, AppError>> {
  metrics.recordNegotiationReceived();

  // Parse the outer envelope.
  const payloadResult = parsePayload(rawPayload);
  if (isErr(payloadResult)) {
    metrics.recordNegotiationRejected();
    return err(payloadResult.error);
  }

  const { negotiation, requirements, offeredAmountUsdc } = payloadResult.value;
  const handledAt = epochToIso(systemClock.now());

  logger.info("cap:negotiation received", {
    negotiationId: negotiation.id,
    buyerAgentId: negotiation.buyerAgentId,
    offeredAmountUsdc,
  });

  // Parse requirements from the buyer.
  const requirementsResult = parseRequirements(requirements);
  if (isErr(requirementsResult)) {
    const reason = requirementsResult.error.message;
    logger.warn("cap:negotiation requirements invalid", { negotiationId: negotiation.id, reason });

    await client.send({
      type: "NEGOTIATION_REJECT",
      payload: { negotiationId: negotiation.id, reason },
    });

    metrics.recordNegotiationRejected();
    return ok({ negotiationId: negotiation.id, accepted: false, reason, handledAt });
  }

  const parsedRequirements = requirementsResult.value;

  // Evaluate against price + policy.
  const decision = evaluateNegotiation(
    parsedRequirements,
    offeredAmountUsdc,
    negotiation.buyerAgentId,
    policyConfig,
  );

  if (!decision.accepted) {
    logger.warn("cap:negotiation rejected by policy", {
      negotiationId: negotiation.id,
      reason: decision.reason,
    });

    await client.send({
      type: "NEGOTIATION_REJECT",
      payload: { negotiationId: negotiation.id, reason: decision.reason },
    });

    metrics.recordNegotiationRejected();
    return ok({
      negotiationId: negotiation.id,
      accepted: false,
      reason: decision.reason,
      handledAt,
    });
  }

  // Accept the negotiation.
  logger.info("cap:negotiation accepted", {
    negotiationId: negotiation.id,
    effort: parsedRequirements.effort,
  });

  await client.send({
    type: "NEGOTIATION_ACCEPT",
    payload: { negotiationId: negotiation.id },
  });

  metrics.recordNegotiationAccepted();

  return ok({
    negotiationId: negotiation.id,
    accepted: true,
    reason: "Accepted by Veritas provider.",
    parsedRequirements,
    handledAt,
  });
}
