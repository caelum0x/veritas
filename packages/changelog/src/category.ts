// Defines enumerated change categories for classifying changelog entries.
import { z } from "zod";

export const CHANGE_CATEGORIES = [
  "added",
  "changed",
  "deprecated",
  "removed",
  "fixed",
  "security",
  "performance",
  "docs",
  "chore",
] as const;

export type ChangeCategory = (typeof CHANGE_CATEGORIES)[number];

export const changeCategorySchema = z.enum(CHANGE_CATEGORIES);

export const CATEGORY_LABELS: Record<ChangeCategory, string> = {
  added: "Added",
  changed: "Changed",
  deprecated: "Deprecated",
  removed: "Removed",
  fixed: "Fixed",
  security: "Security",
  performance: "Performance",
  docs: "Documentation",
  chore: "Chore",
};

export const CATEGORY_EMOJI: Record<ChangeCategory, string> = {
  added: "+",
  changed: "~",
  deprecated: "-",
  removed: "x",
  fixed: "*",
  security: "!",
  performance: "^",
  docs: "?",
  chore: ".",
};

export function isChangeCategory(value: unknown): value is ChangeCategory {
  return CHANGE_CATEGORIES.includes(value as ChangeCategory);
}
