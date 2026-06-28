// Dispute entity: core domain object representing a contested verification outcome.

import { z } from "zod";
import { newId, type Id, type UserId, type IsoTimestamp, epochToIso } from "@veritas/core";

export type DisputeId = Id<"dispute">;
export const newDisputeId = (): DisputeId => newId("dispute");

export const DisputeStatus = {
  OPEN: "OPEN",
  UNDER_REVIEW: "UNDER_REVIEW",
  RESOLVED: "RESOLVED",
  ESCALATED: "ESCALATED",
  WITHDRAWN: "WITHDRAWN",
} as const;
export type DisputeStatus = (typeof DisputeStatus)[keyof typeof DisputeStatus];

export const DisputeStatusSchema = z.enum([
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED",
  "ESCALATED",
  "WITHDRAWN",
]);

export const DisputeSchema = z.object({
  id: z.string(),
  claimId: z.string(),
  verificationId: z.string(),
  initiatorId: z.string(),
  reason: z.string().min(1).max(2000),
  status: DisputeStatusSchema,
  resolution: z.string().nullable(),
  arbitratorId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  resolvedAt: z.string().nullable(),
  metadata: z.record(z.unknown()).default({}),
});

export type Dispute = z.infer<typeof DisputeSchema>;

export interface CreateDisputeInput {
  readonly claimId: string;
  readonly verificationId: string;
  readonly initiatorId: UserId;
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

/** Construct a new Dispute in OPEN status. */
export function createDispute(input: CreateDisputeInput): Dispute {
  const now: IsoTimestamp = epochToIso(Date.now());
  return {
    id: newDisputeId(),
    claimId: input.claimId,
    verificationId: input.verificationId,
    initiatorId: input.initiatorId,
    reason: input.reason,
    status: DisputeStatus.OPEN,
    resolution: null,
    arbitratorId: null,
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
    metadata: input.metadata ?? {},
  };
}

/** Return a new Dispute with updated fields (immutable update). */
export function updateDispute(
  dispute: Dispute,
  patch: Partial<
    Pick<Dispute, "status" | "resolution" | "arbitratorId" | "resolvedAt" | "metadata">
  >,
): Dispute {
  const now: IsoTimestamp = epochToIso(Date.now());
  return { ...dispute, ...patch, updatedAt: now };
}
