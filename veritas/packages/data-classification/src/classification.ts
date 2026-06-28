// Classification levels for data sensitivity: public < internal < confidential < restricted

import { z } from "zod";

export const ClassificationLevelSchema = z.enum([
  "public",
  "internal",
  "confidential",
  "restricted",
]);

export type ClassificationLevel = z.infer<typeof ClassificationLevelSchema>;

export const CLASSIFICATION_LEVELS: readonly ClassificationLevel[] = [
  "public",
  "internal",
  "confidential",
  "restricted",
] as const;

export const CLASSIFICATION_ORDINAL: Record<ClassificationLevel, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
};

/** Returns true if `a` is at least as sensitive as `b`. */
export function atLeast(a: ClassificationLevel, b: ClassificationLevel): boolean {
  return CLASSIFICATION_ORDINAL[a] >= CLASSIFICATION_ORDINAL[b];
}

/** Returns the more sensitive of two levels. */
export function maxLevel(
  a: ClassificationLevel,
  b: ClassificationLevel,
): ClassificationLevel {
  return CLASSIFICATION_ORDINAL[a] >= CLASSIFICATION_ORDINAL[b] ? a : b;
}

/** Human-readable description for each classification level. */
export const CLASSIFICATION_DESCRIPTIONS: Record<ClassificationLevel, string> = {
  public: "No restrictions; freely shareable.",
  internal: "Internal use only; not for public disclosure.",
  confidential: "Sensitive data; need-to-know access required.",
  restricted: "Highest sensitivity; tightly controlled access.",
};
