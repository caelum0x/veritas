// A2A client port: interface + JSON-transport implementation for calling remote A2A agents.

import { z } from "zod";
import {
  type Result,
  ok,
  err,
  tryAsync,
  InternalError,
  ValidationError,
} from "@veritas/core";
import { type Transport, makeEnvelope } from "./transport.js";
import { type A2AAgentCard } from "./agent-card.js";
import { type A2ATask, A2ATaskSchema } from "./task.js";
import { type A2AMessage } from "./message.js";
import { type CapabilityProposal, type NegotiationOutcome } from "./negotiation.js";

/** Options for constructing an A2A client. */
export interface A2AClientOptions {
  /** Transport adapter used for all outbound calls. */
  readonly transport: Transport;
  /** Default per-call timeout in milliseconds (default: 30 000). */
  readonly defaultTimeoutMs?: number;
}

/** Port interface every A2A client must satisfy. */
export interface A2AClient {
  /** Fetch the agent card from a remote endpoint. */
  fetchAgentCard(endpoint: string): Promise<Result<A2AAgentCard>>;

  /** Send a task to a remote agent and return the initial task record. */
  sendTask(endpoint: string, task: A2ATask): Promise<Result<A2ATask>>;

  /** Post a follow-up message to an existing task thread. */
  postMessage(endpoint: string, message: A2AMessage): Promise<Result<void>>;

  /** Initiate capability negotiation with a remote agent. */
  negotiate(
    endpoint: string,
    proposal: CapabilityProposal,
  ): Promise<Result<NegotiationOutcome>>;
}

/** JSON/HTTP transport-backed A2A client implementation. */
export class JsonA2AClient implements A2AClient {
  readonly #transport: Transport;
  readonly #timeoutMs: number;

  constructor(opts: A2AClientOptions) {
    this.#transport = opts.transport;
    this.#timeoutMs = opts.defaultTimeoutMs ?? 30_000;
  }

  async fetchAgentCard(endpoint: string): Promise<Result<A2AAgentCard>> {
    const envelope = makeEnvelope({ method: "agent.card" });
    const res = await this.#transport.send(envelope, {
      endpoint,
      timeoutMs: this.#timeoutMs,
    });
    if (res.ok === false) return res;

    return tryAsync(async () => {
      const parsed: unknown = JSON.parse(res.value.body);
      // Dynamic import to avoid circular at module evaluation time.
      const { A2AAgentCardSchema } = await import("./agent-card.js");
      return A2AAgentCardSchema.parse(parsed) as A2AAgentCard;
    });
  }

  async sendTask(endpoint: string, task: A2ATask): Promise<Result<A2ATask>> {
    const envelope = makeEnvelope({ method: "task.send", params: task });
    const res = await this.#transport.send(envelope, {
      endpoint,
      timeoutMs: this.#timeoutMs,
    });
    if (res.ok === false) return res;

    return tryAsync(async () => {
      const parsed: unknown = JSON.parse(res.value.body);
      return A2ATaskSchema.parse(parsed);
    });
  }

  async postMessage(
    endpoint: string,
    message: A2AMessage,
  ): Promise<Result<void>> {
    const envelope = makeEnvelope({ method: "message.post", params: message });
    const res = await this.#transport.send(envelope, {
      endpoint,
      timeoutMs: this.#timeoutMs,
    });
    if (res.ok === false) return res;
    return ok(undefined);
  }

  async negotiate(
    endpoint: string,
    proposal: CapabilityProposal,
  ): Promise<Result<NegotiationOutcome>> {
    const envelope = makeEnvelope({
      method: "capability.negotiate",
      params: proposal,
    });
    const res = await this.#transport.send(envelope, {
      endpoint,
      timeoutMs: this.#timeoutMs,
    });
    if (res.ok === false) return res;

    return tryAsync(async () => {
      const parsed = JSON.parse(res.value.body) as unknown;
      const OutcomeSchema = z.discriminatedUnion("status", [
        z.object({
          status: z.literal("accepted"),
          agreedPriceUsdc: z.string(),
          quoteHash: z.string(),
        }),
        z.object({
          status: z.literal("rejected"),
          reason: z.string(),
        }),
        z.object({
          status: z.literal("countered"),
          counterProposal: z.record(z.unknown()),
        }),
      ]);
      return OutcomeSchema.parse(parsed) as NegotiationOutcome;
    });
  }
}

/** Construct a JsonA2AClient from options. */
export function createA2AClient(opts: A2AClientOptions): A2AClient {
  return new JsonA2AClient(opts);
}
