// Data label: attaches a classification level and optional tags to a named dataset or field

import { z } from "zod";
import { ClassificationLevelSchema, CLASSIFICATION_ORDINAL, type ClassificationLevel } from "./classification.js";

export const DataLabelSchema = z.object({
  /** Logical name of the data asset (field path, table name, etc.). */
  name: z.string().min(1),
  /** Sensitivity classification. */
  level: ClassificationLevelSchema,
  /** Freeform tags for additional metadata (e.g. "PII", "PHI", "financial"). */
  tags: z.array(z.string()).default([]),
  /** ISO timestamp when the label was last updated. */
  labeledAt: z.string().datetime(),
  /** Identity that applied the label. */
  labeledBy: z.string().min(1),
});

export type DataLabel = z.infer<typeof DataLabelSchema>;

/** Construct a DataLabel, defaulting labeledAt to now. */
export function makeLabel(
  name: string,
  level: ClassificationLevel,
  labeledBy: string,
  tags: string[] = [],
  labeledAt: string = new Date().toISOString(),
): DataLabel {
  return DataLabelSchema.parse({ name, level, tags, labeledAt, labeledBy });
}

function pickMaxLevel(a: ClassificationLevel, b: ClassificationLevel): ClassificationLevel {
  return CLASSIFICATION_ORDINAL[a] >= CLASSIFICATION_ORDINAL[b] ? a : b;
}

/** Merge two labels, taking the more sensitive level and union of tags. */
export function mergeLabels(a: DataLabel, b: DataLabel): DataLabel {
  const level = pickMaxLevel(a.level, b.level);
  const tags = Array.from(new Set([...a.tags, ...b.tags]));
  const labeledAt = new Date().toISOString();
  const labeledBy = `merge(${a.labeledBy},${b.labeledBy})`;
  return makeLabel(a.name, level, labeledBy, tags, labeledAt);
}
