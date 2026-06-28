// Deterministic assignment: resolves which variant a subject receives for an experiment.

import { z } from "zod";
import { ok, err, type Result, asIsoTimestamp } from "@veritas/core";
import { type Experiment } from "./experiment.js";
import { type Variant } from "./variant.js";
import { hashToBucket, findVariantIndex } from "./bucketing.js";
import { ExperimentInactiveError, ExperimentValidationError } from "./errors.js";

export const AssignmentSchema = z.object({
  experimentId: z.string(),
  experimentKey: z.string(),
  subjectId: z.string(),
  variantId: z.string(),
  variantKey: z.string(),
  bucket: z.number(),
  assignedAt: z.string(),
});

export type Assignment = z.infer<typeof AssignmentSchema>;

export interface AssignmentContext {
  readonly subjectId: string;
  /** Optional salt override; defaults to experiment key. */
  readonly salt?: string;
}

/**
 * Assign a subject to a variant using deterministic hash bucketing.
 * Returns Err if experiment is not running or no variant covers the bucket.
 */
export function assign(
  experiment: Experiment,
  variants: readonly Variant[],
  context: AssignmentContext,
): Result<Assignment, ExperimentInactiveError | ExperimentValidationError> {
  if (experiment.status !== "running") {
    return err(new ExperimentInactiveError(experiment.key));
  }

  const salt = context.salt ?? experiment.key;
  const bucket = hashToBucket(context.subjectId, salt);
  const weights = variants.map((v) => v.weight);
  const idx = findVariantIndex(bucket, weights);

  if (idx === -1 || idx >= variants.length) {
    return err(new ExperimentValidationError(`Subject '${context.subjectId}' not assigned to any variant in '${experiment.key}'.`));
  }

  const variant = variants[idx]!;
  return ok({
    experimentId: experiment.id,
    experimentKey: experiment.key,
    subjectId: context.subjectId,
    variantId: variant.id,
    variantKey: variant.key,
    bucket,
    assignedAt: asIsoTimestamp(new Date().toISOString()),
  });
}

/**
 * Assign a subject to a variant, returning a default variant key on failure.
 */
export function assignOrDefault(
  experiment: Experiment,
  variants: readonly Variant[],
  context: AssignmentContext,
  defaultVariantKey: string,
): Assignment {
  const result = assign(experiment, variants, context);
  if (result.ok) return result.value;

  const now = asIsoTimestamp(new Date().toISOString());
  const controlVariant = variants.find((v) => v.key === defaultVariantKey) ?? variants[0];
  return {
    experimentId: experiment.id,
    experimentKey: experiment.key,
    subjectId: context.subjectId,
    variantId: controlVariant?.id ?? "",
    variantKey: defaultVariantKey,
    bucket: 0,
    assignedAt: now,
  };
}
