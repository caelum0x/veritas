// Shared type aliases and value-object definitions for the dispute domain.

import { z } from "zod";
import type { Dispute } from "./dispute.js";
import type { DisputeStatus } from "./dispute.js";
import type { IsoTimestamp } from "@veritas/core";

export type { DisputeId } from "./dispute.js";

/** Escalation level within the dispute resolution hierarchy. */
export type EscalationLevel = "peer" | "moderator" | "arbitration";

/** State of a dispute (alias of DisputeStatus for state-machine consumers). */
export type DisputeState = DisputeStatus;

/** Historical record of a single escalation applied to a dispute. */
export type EscalationRecord = {
  readonly fromLevel: EscalationLevel;
  readonly toLevel: EscalationLevel;
  readonly escalatedAt: IsoTimestamp;
  readonly reason: string;
};

/** Unique brand for arbitrator user IDs (re-uses the string base type). */
export type ArbitratorId = string & { readonly _brand: "ArbitratorId" };

/** Input accepted when assigning an arbitrator to a dispute. */
export interface AssignArbitratorInput {
  readonly disputeId: string;
  readonly arbitratorId: ArbitratorId;
  readonly assignedById: string;
}

/** Input for adding a resolution outcome to a dispute. */
export interface ResolveDisputeInput {
  readonly disputeId: string;
  readonly resolution: string;
  readonly resolvedById: string;
}

/** Input for escalating a dispute to a higher tier. */
export interface EscalateDisputeInput {
  readonly disputeId: string;
  readonly reason: string;
  readonly escalatedById: string;
}

/** Input for withdrawing an open dispute by its initiator. */
export interface WithdrawDisputeInput {
  readonly disputeId: string;
  readonly withdrawnById: string;
}

/** Pagination/filter params for listing disputes. */
export const DisputeListParamsSchema = z.object({
  claimId: z.string().optional(),
  verificationId: z.string().optional(),
  initiatorId: z.string().optional(),
  arbitratorId: z.string().optional(),
  status: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
export type DisputeListParams = z.infer<typeof DisputeListParamsSchema>;

/** Port interface for the dispute event notification subsystem. */
export interface DisputeNotifier {
  onDisputeOpened(dispute: Dispute): Promise<void>;
  onDisputeUnderReview(dispute: Dispute): Promise<void>;
  onDisputeResolved(dispute: Dispute): Promise<void>;
  onDisputeEscalated(dispute: Dispute): Promise<void>;
  onDisputeWithdrawn(dispute: Dispute): Promise<void>;
}

/** Allowed status transitions for the dispute state machine. */
export const ALLOWED_TRANSITIONS: Readonly<Record<DisputeStatus, ReadonlyArray<DisputeStatus>>> = {
  OPEN: ["UNDER_REVIEW", "WITHDRAWN"],
  UNDER_REVIEW: ["RESOLVED", "ESCALATED"],
  ESCALATED: ["RESOLVED"],
  RESOLVED: [],
  WITHDRAWN: [],
} as const;
