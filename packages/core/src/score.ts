// Confidence score value type bounded to the unit interval [0, 1].

import type { Brand } from "./brand.js";
import { clamp, contains, UNIT_RANGE } from "./range.js";
import { ValidationError } from "./errors/validation-error.js";

/** A confidence score in [0, 1]. */
export type Score = Brand<number, "Score">;

/** Validate and brand a number as a Score, throwing if out of range. */
export function asScore(value: number): Score {
  if (!Number.isFinite(value) || !contains(UNIT_RANGE, value)) {
    throw new ValidationError({ message: `Score must be in [0,1], got ${value}` });
  }
  return value as Score;
}

/** Clamp any number into a valid Score. */
export function clampScore(value: number): Score {
  return clamp(UNIT_RANGE, Number.isFinite(value) ? value : 0) as Score;
}

/** Combine scores by arithmetic mean; empty input yields 0. */
export function meanScore(scores: readonly Score[]): Score {
  if (scores.length === 0) return 0 as Score;
  const sum = scores.reduce((acc, s) => acc + s, 0);
  return clampScore(sum / scores.length);
}

/** Render a score as a whole-number percentage string, e.g. "87%". */
export function formatScorePercent(score: Score): string {
  return `${Math.round(score * 100)}%`;
}
