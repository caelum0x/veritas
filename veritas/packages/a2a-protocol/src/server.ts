// A2A server handler: routes inbound A2A envelopes to registered method handlers.

import { type Result, ok, err, isOk, isAppError, ValidationError, NotFoundError } from "@veritas/core";
import { type TransportEnvelope, makeEnvelope } from "./transport.js";
import { type A2AAgentCard } from "./agent-card.js";
import { type A2ATask } from "./task.js";
import { type A2AMessage } from "./message.js";
import { type CapabilityProposal, type NegotiationOutcome } from "./negotiation.js";

/** Context passed to every method handler. */
export interface HandlerContext {
  /** Raw inbound envelope (for access to correlationId, sentAt, etc.). */
  readonly envelope: TransportEnvelope;
}

/** Typed handler registry a2a server dispatches through. */
export interface A2AHandlers {
  /** Return this agent's capability card. */
  onAgentCard(ctx: HandlerContext): Promise<Result<A2AAgentCard>>;
  /** Accept and process an inbound task. */
  onTaskSend(ctx: HandlerContext, task: A2ATask): Promise<Result<A2ATask>>;
  /** Accept a follow-up message on an existing task. */
  onMessagePost(ctx: HandlerContext, message: A2AMessage): Promise<Result<void>>;
  /** Evaluate a capability negotiation proposal. */
  onNegotiate(
    ctx: HandlerContext,
    proposal: CapabilityProposal,
  ): Promise<Result<NegotiationOutcome>>;
}

/** Wire protocol shape expected in every inbound envelope body. */
interface A2ARequest {
  method: string;
  params?: unknown;
}

function parseRequest(body: string): Result<A2ARequest> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return err(new ValidationError({ message: "Invalid JSON in transport envelope body" }));
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("method" in parsed) ||
    typeof (parsed as Record<string, unknown>).method !== "string"
  ) {
    return err(new ValidationError({ message: 'Request must have a string "method" field' }));
  }
  return ok(parsed as A2ARequest);
}

/** Dispatch an inbound envelope to the appropriate handler and serialise the response. */
export async function handleEnvelope(
  envelope: TransportEnvelope,
  handlers: A2AHandlers,
): Promise<TransportEnvelope> {
  const ctx: HandlerContext = { envelope };

  const reqResult = parseRequest(envelope.body);
  if (!isOk(reqResult)) {
    const e = reqResult.error;
    const message = isAppError(e) ? e.message : "Parse error";
    return makeEnvelope(
      { error: message },
      envelope.correlationId,
    );
  }

  const req = reqResult.value;

  let handlerResult: Result<unknown>;

  switch (req.method) {
    case "agent.card": {
      handlerResult = await handlers.onAgentCard(ctx);
      break;
    }
    case "task.send": {
      handlerResult = await handlers.onTaskSend(ctx, req.params as A2ATask);
      break;
    }
    case "message.post": {
      handlerResult = await handlers.onMessagePost(ctx, req.params as A2AMessage);
      break;
    }
    case "capability.negotiate": {
      handlerResult = await handlers.onNegotiate(
        ctx,
        req.params as CapabilityProposal,
      );
      break;
    }
    default: {
      handlerResult = err(
        new NotFoundError({ message: `Unknown A2A method: ${req.method}` }),
      );
    }
  }

  if (isOk(handlerResult)) {
    return makeEnvelope({ result: handlerResult.value }, envelope.correlationId);
  }

  const e = handlerResult.error;
  const message =
    e instanceof Error ? e.message : "Internal server error";
  return makeEnvelope({ error: message }, envelope.correlationId);
}

/** Create a handler that logs and dispatches every inbound envelope. */
export function createA2AServer(handlers: A2AHandlers): (env: TransportEnvelope) => Promise<TransportEnvelope> {
  return (envelope) => handleEnvelope(envelope, handlers);
}
