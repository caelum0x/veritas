// Arbitration: assignment and lifecycle of an arbitrator for a dispute panel.

import { z } from "zod";
import { newId, type Id, type UserId, epochToIso, type IsoTimestamp, ok, err, type Result } from "@veritas/core";
import { ConflictError, NotFoundError } from "@veritas/core";
import type { DisputeId } from "./dispute.js";

export type ArbitrationId = Id<"arb">;
export const newArbitrationId = (): ArbitrationId => newId("arb");

export const ArbitrationStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
  COMPLETED: "COMPLETED",
} as const;
export type ArbitrationStatus = (typeof ArbitrationStatus)[keyof typeof ArbitrationStatus];

export const ArbitrationStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "COMPLETED",
]);

export const ArbitrationSchema = z.object({
  id: z.string(),
  disputeId: z.string(),
  arbitratorId: z.string(),
  status: ArbitrationStatusSchema,
  notes: z.string().nullable(),
  assignedAt: z.string(),
  acceptedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  metadata: z.record(z.unknown()).default({}),
});

export type Arbitration = z.infer<typeof ArbitrationSchema>;

export interface AssignArbitratorInput {
  readonly disputeId: DisputeId;
  readonly arbitratorId: UserId;
  readonly metadata?: Record<string, unknown>;
}

/** Assign an arbitrator to a dispute, creating a PENDING Arbitration. */
export function assignArbitrator(input: AssignArbitratorInput): Arbitration {
  const now: IsoTimestamp = epochToIso(Date.now());
  return {
    id: newArbitrationId(),
    disputeId: input.disputeId,
    arbitratorId: input.arbitratorId,
    status: ArbitrationStatus.PENDING,
    notes: null,
    assignedAt: now,
    acceptedAt: null,
    completedAt: null,
    metadata: input.metadata ?? {},
  };
}

/** Transition an Arbitration to ACCEPTED (immutable update). */
export function acceptArbitration(
  arb: Arbitration,
): Result<Arbitration, ConflictError> {
  if (arb.status !== ArbitrationStatus.PENDING) {
    return err(
      new ConflictError({
        message: `Cannot accept arbitration in status: ${arb.status}`,
      }),
    );
  }
  const now: IsoTimestamp = epochToIso(Date.now());
  return ok({ ...arb, status: ArbitrationStatus.ACCEPTED, acceptedAt: now });
}

/** Transition an Arbitration to DECLINED (immutable update). */
export function declineArbitration(
  arb: Arbitration,
): Result<Arbitration, ConflictError> {
  if (arb.status !== ArbitrationStatus.PENDING) {
    return err(
      new ConflictError({
        message: `Cannot decline arbitration in status: ${arb.status}`,
      }),
    );
  }
  return ok({ ...arb, status: ArbitrationStatus.DECLINED });
}

/** Mark an Arbitration as COMPLETED with optional notes (immutable update). */
export function completeArbitration(
  arb: Arbitration,
  notes?: string,
): Result<Arbitration, ConflictError> {
  if (arb.status !== ArbitrationStatus.ACCEPTED) {
    return err(
      new ConflictError({
        message: `Cannot complete arbitration in status: ${arb.status}`,
      }),
    );
  }
  const now: IsoTimestamp = epochToIso(Date.now());
  return ok({
    ...arb,
    status: ArbitrationStatus.COMPLETED,
    notes: notes ?? arb.notes,
    completedAt: now,
  });
}
