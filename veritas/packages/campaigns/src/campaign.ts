// Campaign aggregate: creation, lifecycle transitions, and validation.

import { z } from "zod";
import { ok, err, newId, epochToIso, type Result } from "@veritas/core";
import {
  CampaignStatusSchema,
  CampaignChannelSchema,
  TriggerTypeSchema,
  type CampaignStatus,
} from "./types.js";
import {
  CampaignValidationError,
  CampaignConflictError,
} from "./errors.js";

export const CampaignSchema = z.object({
  id: z.string().min(1),
  orgId: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  status: CampaignStatusSchema,
  channel: CampaignChannelSchema,
  triggerType: TriggerTypeSchema,
  audienceId: z.string().min(1),
  messageId: z.string().min(1),
  scheduleId: z.string().optional(),
  triggerId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Campaign = z.infer<typeof CampaignSchema>;

export const CreateCampaignInputSchema = CampaignSchema.omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateCampaignInput = z.infer<typeof CreateCampaignInputSchema>;

/** Valid status transitions for a campaign lifecycle. */
const VALID_TRANSITIONS: Record<CampaignStatus, ReadonlyArray<CampaignStatus>> = {
  draft: ["scheduled", "running", "cancelled"],
  scheduled: ["running", "paused", "cancelled"],
  running: ["paused", "completed", "cancelled"],
  paused: ["running", "cancelled"],
  completed: [],
  cancelled: [],
};

/** Creates a new campaign in draft status. */
export function createCampaign(
  input: CreateCampaignInput,
): Result<Campaign, CampaignValidationError> {
  const parsed = CreateCampaignInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      new CampaignValidationError(
        parsed.error.issues.map((i) => i.message).join("; "),
      ),
    );
  }
  const now = epochToIso(Date.now());
  const campaign: Campaign = {
    ...parsed.data,
    id: newId("campaign"),
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  return ok(campaign);
}

/** Transitions a campaign to a new status, returning updated campaign or error. */
export function transitionCampaign(
  campaign: Campaign,
  next: CampaignStatus,
): Result<Campaign, CampaignConflictError> {
  const allowed = VALID_TRANSITIONS[campaign.status];
  if (!allowed.includes(next)) {
    return err(
      new CampaignConflictError(
        `Cannot transition campaign from "${campaign.status}" to "${next}"`,
      ),
    );
  }
  return ok({
    ...campaign,
    status: next,
    updatedAt: epochToIso(Date.now()),
  });
}

/** Returns true when the campaign can accept recipients for sending. */
export function isSendable(campaign: Campaign): boolean {
  return campaign.status === "running";
}
