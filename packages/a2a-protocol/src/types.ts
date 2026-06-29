// Shared A2A protocol primitive types used across the module.

import { z } from "zod";

/** Status of an A2A task in its lifecycle. */
export const A2ATaskStatusSchema = z.enum([
  "pending",
  "in-progress",
  "completed",
  "failed",
  "cancelled",
]);
export type A2ATaskStatus = z.infer<typeof A2ATaskStatusSchema>;

/** Execution priority hint for task scheduling. */
export const A2ATaskPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export type A2ATaskPriority = z.infer<typeof A2ATaskPrioritySchema>;

/** Capability negotiation outcome between two agents. */
export const A2ANegotiationOutcomeSchema = z.enum([
  "accepted",
  "rejected",
  "counter-offered",
]);
export type A2ANegotiationOutcome = z.infer<typeof A2ANegotiationOutcomeSchema>;

/** Artifact content kind produced by a task. */
export const A2AArtifactKindSchema = z.enum([
  "verification-report",
  "citation-list",
  "evidence-bundle",
  "raw-text",
  "json",
]);
export type A2AArtifactKind = z.infer<typeof A2AArtifactKindSchema>;

/** Minimal identity reference for an agent in a conversation. */
export const A2AAgentRefSchema = z.object({
  agentId: z.string().min(1),
  endpoint: z.string().url(),
  /** Optional human-readable label. */
  name: z.string().optional(),
});
export type A2AAgentRef = z.infer<typeof A2AAgentRefSchema>;

/** Freeform JSON-safe metadata attached to protocol objects. */
export type A2AMetadata = Readonly<Record<string, unknown>>;

/** Wire format for a structured error returned in A2A responses. */
export const A2AWireErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type A2AWireError = z.infer<typeof A2AWireErrorSchema>;

/** Top-level A2A JSON-RPC-style response envelope. */
export const A2AResponseEnvelopeSchema = z.object({
  /** Protocol version, always "1.0". */
  version: z.literal("1.0"),
  /** Correlation id echoed from the request. */
  correlationId: z.string().optional(),
  /** Successful payload (null when error is set). */
  result: z.unknown().nullable(),
  /** Error info (null when result is set). */
  error: A2AWireErrorSchema.nullable(),
});
export type A2AResponseEnvelope = z.infer<typeof A2AResponseEnvelopeSchema>;

/** Build a successful A2A response envelope. */
export function makeA2ASuccess(
  result: unknown,
  correlationId?: string
): A2AResponseEnvelope {
  return { version: "1.0", correlationId, result, error: null };
}

/** Build an error A2A response envelope. */
export function makeA2AError(
  code: string,
  message: string,
  correlationId?: string,
  details?: Record<string, unknown>
): A2AResponseEnvelope {
  return {
    version: "1.0",
    correlationId,
    result: null,
    error: { code, message, details },
  };
}
