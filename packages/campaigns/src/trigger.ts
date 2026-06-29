// Campaign trigger: event-based and API-based campaign activation rules.

import { z } from "zod";
import { ok, err, newId, epochToIso, type Result } from "@veritas/core";
import { TriggerTypeSchema } from "./types.js";
import { CampaignValidationError } from "./errors.js";

export const TriggerConditionSchema = z.object({
  eventName: z.string().min(1),
  /** Optional JSON-path-style attribute filter on the event payload. */
  attribute: z.string().optional(),
  operator: z.enum(["eq", "neq", "gt", "lt", "contains"]).optional(),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});
export type TriggerCondition = z.infer<typeof TriggerConditionSchema>;

export const CampaignTriggerSchema = z.object({
  id: z.string().min(1),
  orgId: z.string().min(1),
  campaignId: z.string().min(1),
  type: TriggerTypeSchema,
  conditions: z.array(TriggerConditionSchema).default([]),
  /** Minimum seconds between re-triggering for the same recipient. */
  cooldownSeconds: z.number().int().nonnegative().default(0),
  /** Maximum number of times this trigger fires globally (0 = unlimited). */
  maxFires: z.number().int().nonnegative().default(0),
  fireCount: z.number().int().nonnegative().default(0),
  enabled: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CampaignTrigger = z.infer<typeof CampaignTriggerSchema>;

export const CreateTriggerInputSchema = CampaignTriggerSchema.omit({
  id: true,
  fireCount: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateTriggerInput = z.infer<typeof CreateTriggerInputSchema>;

/** An incoming platform event that may activate a trigger. */
export interface TriggerEvent {
  readonly name: string;
  readonly recipientId: string;
  readonly occurredAt: string;
  readonly payload: Readonly<Record<string, string | number | boolean>>;
}

/** Creates a new campaign trigger. */
export function createTrigger(
  input: CreateTriggerInput,
): Result<CampaignTrigger, CampaignValidationError> {
  const parsed = CreateTriggerInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      new CampaignValidationError(
        parsed.error.issues.map((i) => i.message).join("; "),
      ),
    );
  }
  const now = epochToIso(Date.now());
  return ok({
    ...parsed.data,
    id: newId("trigger"),
    fireCount: 0,
    createdAt: now,
    updatedAt: now,
  });
}

/** Evaluates whether an event satisfies all conditions of a trigger. */
export function matchesTrigger(
  trigger: CampaignTrigger,
  event: TriggerEvent,
): boolean {
  if (!trigger.enabled) return false;
  if (trigger.maxFires > 0 && trigger.fireCount >= trigger.maxFires) return false;
  if (trigger.conditions.length === 0) return trigger.type === "event" && trigger.conditions.length === 0;
  return trigger.conditions.every((cond) => {
    if (event.name !== cond.eventName) return false;
    if (cond.attribute === undefined || cond.operator === undefined || cond.value === undefined) return true;
    const val = event.payload[cond.attribute];
    if (val === undefined) return false;
    switch (cond.operator) {
      case "eq": return val === cond.value;
      case "neq": return val !== cond.value;
      case "gt": return typeof val === "number" && typeof cond.value === "number" && val > cond.value;
      case "lt": return typeof val === "number" && typeof cond.value === "number" && val < cond.value;
      case "contains": return typeof val === "string" && typeof cond.value === "string" && val.includes(cond.value);
      default: return false;
    }
  });
}

/** Returns updated trigger after a successful fire, incrementing fireCount. */
export function recordTriggerFire(trigger: CampaignTrigger): CampaignTrigger {
  return {
    ...trigger,
    fireCount: trigger.fireCount + 1,
    updatedAt: epochToIso(Date.now()),
  };
}
