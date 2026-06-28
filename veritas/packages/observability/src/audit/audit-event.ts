// Audit event type definitions for structured security and compliance logging.
import { z } from "zod";
import type { IsoTimestamp } from "@veritas/core";

/** The category of actor performing an auditable action. */
export const AuditActorTypeSchema = z.enum(["user", "agent", "system", "api_key"]);
export type AuditActorType = z.infer<typeof AuditActorTypeSchema>;

/** Represents the entity that performed the action. */
export interface AuditActor {
  readonly type: AuditActorType;
  /** Opaque identifier for the actor (userId, agentId, key prefix, etc.). */
  readonly id: string;
  /** Human-readable label (email, agent name, etc.) — may be absent for system actors. */
  readonly label?: string;
  /** IP address of the request origin, if available. */
  readonly ip?: string;
}

/** Possible outcomes of an audited operation. */
export type AuditOutcome = "success" | "failure" | "denied";

/** Structured representation of a single auditable event. */
export interface AuditEvent {
  /** Unique identifier for this audit record. */
  readonly id: string;
  /** ISO-8601 timestamp of when the event occurred. */
  readonly occurredAt: IsoTimestamp;
  /** Logical operation name, e.g. "claim.create" or "order.settle". */
  readonly action: string;
  /** Optional resource type, e.g. "Claim", "Order". */
  readonly resourceType?: string;
  /** Optional resource identifier. */
  readonly resourceId?: string;
  /** Actor that performed the action. */
  readonly actor: AuditActor;
  /** Whether the action succeeded, failed, or was denied. */
  readonly outcome: AuditOutcome;
  /** HTTP status or domain error code, if applicable. */
  readonly statusCode?: number;
  /** Short human-readable description of what happened. */
  readonly message?: string;
  /** Arbitrary key-value metadata — must be serialisable to JSON. */
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** Correlation / request-trace id for linking to logs and traces. */
  readonly correlationId?: string;
}

/** Zod schema for runtime-validating an AuditEvent. */
export const AuditEventSchema = z.object({
  id: z.string().min(1),
  occurredAt: z.string().datetime({ offset: true }),
  action: z.string().min(1),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  actor: z.object({
    type: AuditActorTypeSchema,
    id: z.string().min(1),
    label: z.string().optional(),
    ip: z.string().optional(),
  }),
  outcome: z.enum(["success", "failure", "denied"]),
  statusCode: z.number().int().optional(),
  message: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  correlationId: z.string().optional(),
});
