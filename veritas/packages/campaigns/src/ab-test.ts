// A/B variant assignment using deterministic weighted selection per recipient.

import { ok, err, type Result } from "@veritas/core";
import type { MessageVariant } from "./types.js";
import { CampaignValidationError } from "./errors.js";

export interface AbTestConfig {
  readonly variants: ReadonlyArray<MessageVariant>;
}

/** Validates that variant weights sum to 100. */
export function validateVariants(
  variants: ReadonlyArray<MessageVariant>,
): Result<void, CampaignValidationError> {
  if (variants.length === 0) {
    return err(new CampaignValidationError("At least one variant is required"));
  }
  const total = variants.reduce((sum, v) => sum + v.weight, 0);
  if (Math.abs(total - 100) > 0.001) {
    return err(
      new CampaignValidationError(
        `Variant weights must sum to 100, got ${total}`,
      ),
    );
  }
  return ok(undefined);
}

/**
 * Assigns a variant to a recipient deterministically using a simple hash of
 * recipientId + campaignId so the same recipient always gets the same variant.
 */
export function assignVariant(
  recipientId: string,
  campaignId: string,
  variants: ReadonlyArray<MessageVariant>,
): Result<MessageVariant, CampaignValidationError> {
  const valid = validateVariants(variants);
  if (valid.ok === false) return valid as Result<MessageVariant, CampaignValidationError>;

  // Deterministic hash: djb2 over concatenated ids
  const seed = `${campaignId}:${recipientId}`;
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) >>> 0;
  }
  const bucket = hash % 100;

  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      return ok(variant);
    }
  }
  // Fallback to last variant (rounding edge case)
  return ok(variants[variants.length - 1]!);
}

/** Returns a summary of how many recipients would be assigned to each variant. */
export function previewDistribution(
  recipientIds: ReadonlyArray<string>,
  campaignId: string,
  variants: ReadonlyArray<MessageVariant>,
): Result<Record<string, number>, CampaignValidationError> {
  const valid = validateVariants(variants);
  if (valid.ok === false) return valid as Result<Record<string, number>, CampaignValidationError>;

  const counts: Record<string, number> = Object.fromEntries(
    variants.map((v) => [v.id, 0]),
  );

  for (const recipientId of recipientIds) {
    const assigned = assignVariant(recipientId, campaignId, variants);
    if (assigned.ok === true) {
      counts[assigned.value.id] = (counts[assigned.value.id] ?? 0) + 1;
    }
  }

  return ok(counts);
}
