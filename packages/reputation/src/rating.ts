// Rating value object: a validated 1-5 integer star value with optional comment.

import { ValidationError } from "@veritas/core";
import { z } from "zod";

/** Integer star rating bounded to [1, 5]. */
export type RatingValue = 1 | 2 | 3 | 4 | 5;

/** Immutable rating value object. */
export interface Rating {
  readonly value: RatingValue;
  readonly comment: string | undefined;
}

/** Zod schema for a Rating. */
export const ratingSchema = z.object({
  value: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  comment: z.string().max(1000).optional(),
});

/** Construct a Rating, throwing ValidationError if out of range. */
export function createRating(value: number, comment?: string): Rating {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new ValidationError({
      message: `Rating value must be an integer in [1, 5], got ${value}`,
    });
  }
  return {
    value: value as RatingValue,
    comment: comment?.trim() || undefined,
  };
}

/** Normalise a RatingValue to a Score-compatible number in [0, 1]. */
export function ratingToScore(value: RatingValue): number {
  return (value - 1) / 4;
}

/** Convert a normalised score in [0, 1] back to the nearest RatingValue. */
export function scoreToRating(score: number): RatingValue {
  const clamped = Math.min(1, Math.max(0, score));
  return (Math.round(clamped * 4) + 1) as RatingValue;
}

/** Compute the arithmetic mean of an array of RatingValues. */
export function meanRating(values: readonly RatingValue[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
