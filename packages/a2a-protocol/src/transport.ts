// Transport port: abstract send/receive interface for A2A protocol messages.

import { z } from "zod";
import { type Result } from "@veritas/core";

/** Envelope wrapping any A2A JSON payload in transit. */
export const TransportEnvelopeSchema = z.object({
  /** MIME-style content type, e.g. "application/a2a+json". */
  contentType: z.string(),
  /** Raw UTF-8 JSON body. */
  body: z.string(),
  /** Optional correlation id for request-reply matching. */
  correlationId: z.string().optional(),
  /** Unix epoch ms of envelope creation. */
  sentAt: z.number(),
});
export type TransportEnvelope = z.infer<typeof TransportEnvelopeSchema>;

/** Options for an outbound send call. */
export interface SendOptions {
  /** Target agent endpoint URL. */
  readonly endpoint: string;
  /** Optional per-call timeout override in milliseconds. */
  readonly timeoutMs?: number;
}

/** Port interface: all transport adapters implement this. */
export interface Transport {
  /**
   * Send an envelope to a remote A2A endpoint.
   * Returns the raw response envelope on success.
   */
  send(envelope: TransportEnvelope, opts: SendOptions): Promise<Result<TransportEnvelope>>;

  /**
   * Register a handler invoked for every inbound envelope.
   * Returns an unsubscribe function.
   */
  onReceive(handler: (envelope: TransportEnvelope) => Promise<void>): () => void;

  /** Gracefully close any underlying connections. */
  close(): Promise<void>;
}

/** Factory type for constructing a Transport from a base URL. */
export type TransportFactory = (baseUrl: string) => Transport;

/** Build a minimal TransportEnvelope from a serialised payload. */
export function makeEnvelope(
  body: unknown,
  correlationId?: string,
): TransportEnvelope {
  return {
    contentType: "application/a2a+json",
    body: JSON.stringify(body),
    correlationId,
    sentAt: Date.now(),
  };
}
