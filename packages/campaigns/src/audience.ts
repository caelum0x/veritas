// Audience definition: filter-based recipient segmentation for campaigns.

import { z } from "zod";
import { ok, err, newId, epochToIso, type Result } from "@veritas/core";
import { AudienceFilterSchema, type AudienceFilter } from "./types.js";
import { AudienceEmptyError, CampaignValidationError } from "./errors.js";

export const AudienceSchema = z.object({
  id: z.string().min(1),
  orgId: z.string().min(1),
  name: z.string().min(1).max(200),
  filters: z.array(AudienceFilterSchema).min(0),
  estimatedSize: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Audience = z.infer<typeof AudienceSchema>;

export const CreateAudienceInputSchema = AudienceSchema.omit({
  id: true,
  estimatedSize: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateAudienceInput = z.infer<typeof CreateAudienceInputSchema>;

/** A recipient record matched by audience filters. */
export interface Recipient {
  readonly id: string;
  readonly email?: string;
  readonly attributes: Readonly<Record<string, string | number | boolean>>;
}

/** Creates a new audience definition. */
export function createAudience(
  input: CreateAudienceInput,
): Result<Audience, CampaignValidationError> {
  const parsed = CreateAudienceInputSchema.safeParse(input);
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
    id: newId("audience"),
    estimatedSize: 0,
    createdAt: now,
    updatedAt: now,
  });
}

/** Evaluates a single filter against a recipient's attributes. */
function evaluateFilter(filter: AudienceFilter, recipient: Recipient): boolean {
  const val = recipient.attributes[filter.field];
  if (val === undefined) return false;
  switch (filter.operator) {
    case "eq": return val === filter.value;
    case "neq": return val !== filter.value;
    case "gt": return typeof val === "number" && typeof filter.value === "number" && val > filter.value;
    case "lt": return typeof val === "number" && typeof filter.value === "number" && val < filter.value;
    case "gte": return typeof val === "number" && typeof filter.value === "number" && val >= filter.value;
    case "lte": return typeof val === "number" && typeof filter.value === "number" && val <= filter.value;
    case "contains": return typeof val === "string" && typeof filter.value === "string" && val.includes(filter.value);
    case "in": return Array.isArray(filter.value) && filter.value.includes(String(val));
    default: return false;
  }
}

/** Matches a recipient pool against an audience definition (all filters are AND-ed). */
export function matchAudience(
  audience: Audience,
  pool: ReadonlyArray<Recipient>,
): ReadonlyArray<Recipient> {
  if (audience.filters.length === 0) return pool;
  return pool.filter((r) => audience.filters.every((f) => evaluateFilter(f, r)));
}

/** Resolves recipients or errors when audience is empty. */
export function resolveRecipients(
  audience: Audience,
  pool: ReadonlyArray<Recipient>,
  campaignId: string,
): Result<ReadonlyArray<Recipient>, AudienceEmptyError> {
  const matched = matchAudience(audience, pool);
  if (matched.length === 0) {
    return err(new AudienceEmptyError(campaignId));
  }
  return ok(matched);
}
