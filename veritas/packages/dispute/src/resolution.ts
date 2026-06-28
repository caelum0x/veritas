// Resolution outcomes: final decisions applied when a dispute is closed.

import { z } from "zod";
import { newId, type Id, type UserId, epochToIso, type IsoTimestamp, ok, err, type Result } from "@veritas/core";
import { ValidationError } from "@veritas/core";
import { type Dispute, DisputeStatus, updateDispute } from "./dispute.js";
import { isTransitionAllowed } from "./state-machine.js";

export type ResolutionId = Id<"res">;
export const newResolutionId = (): ResolutionId => newId("res");

export const ResolutionOutcome = {
  UPHELD: "UPHELD",
  OVERTURNED: "OVERTURNED",
  PARTIAL: "PARTIAL",
  INCONCLUSIVE: "INCONCLUSIVE",
} as const;
export type ResolutionOutcome = (typeof ResolutionOutcome)[keyof typeof ResolutionOutcome];

export const ResolutionOutcomeSchema = z.enum([
  "UPHELD",
  "OVERTURNED",
  "PARTIAL",
  "INCONCLUSIVE",
]);

export const ResolutionSchema = z.object({
  id: z.string(),
  disputeId: z.string(),
  resolvedById: z.string(),
  outcome: ResolutionOutcomeSchema,
  summary: z.string().min(1).max(5000),
  actionRequired: z.boolean(),
  actionDescription: z.string().nullable(),
  createdAt: z.string(),
  metadata: z.record(z.unknown()).default({}),
});

export type Resolution = z.infer<typeof ResolutionSchema>;

export interface CreateResolutionInput {
  readonly disputeId: string;
  readonly resolvedById: UserId;
  readonly outcome: ResolutionOutcome;
  readonly summary: string;
  readonly actionRequired?: boolean;
  readonly actionDescription?: string | null;
  readonly metadata?: Record<string, unknown>;
}

/** Construct a Resolution record (immutable). */
export function createResolution(input: CreateResolutionInput): Resolution {
  const now: IsoTimestamp = epochToIso(Date.now());
  return {
    id: newResolutionId(),
    disputeId: input.disputeId,
    resolvedById: input.resolvedById,
    outcome: input.outcome,
    summary: input.summary,
    actionRequired: input.actionRequired ?? false,
    actionDescription: input.actionDescription ?? null,
    createdAt: now,
    metadata: input.metadata ?? {},
  };
}

export interface ApplyResolutionResult {
  readonly dispute: Dispute;
  readonly resolution: Resolution;
}

/** Apply a resolution to a dispute, transitioning it to RESOLVED. */
export function applyResolution(
  dispute: Dispute,
  input: Omit<CreateResolutionInput, "disputeId">,
): Result<ApplyResolutionResult, ValidationError> {
  if (!isTransitionAllowed(dispute.status, DisputeStatus.RESOLVED)) {
    return err(
      new ValidationError({
        message: `Cannot resolve a dispute in status: ${dispute.status}`,
        details: { currentStatus: dispute.status },
      }),
    );
  }
  const now: IsoTimestamp = epochToIso(Date.now());
  const resolution = createResolution({ ...input, disputeId: dispute.id });
  const resolved = updateDispute(dispute, {
    status: DisputeStatus.RESOLVED,
    resolution: resolution.summary,
    resolvedAt: now,
  });
  return ok({ dispute: resolved, resolution });
}

/** Human-readable label for a resolution outcome. */
export function labelOutcome(outcome: ResolutionOutcome): string {
  switch (outcome) {
    case ResolutionOutcome.UPHELD:
      return "Dispute upheld — original decision stands";
    case ResolutionOutcome.OVERTURNED:
      return "Dispute overturned — decision reversed";
    case ResolutionOutcome.PARTIAL:
      return "Partially upheld — mixed outcome";
    case ResolutionOutcome.INCONCLUSIVE:
      return "Inconclusive — insufficient evidence";
  }
}
