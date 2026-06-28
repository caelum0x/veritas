// Represents a single changelog entry with metadata and categorization.
import { z } from "zod";
import type { IsoTimestamp } from "@veritas/core";
import { isoTimestampSchema } from "@veritas/core";
import type { ChangeCategory } from "./category.js";
import { changeCategorySchema } from "./category.js";

export const changeEntrySchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  category: changeCategorySchema,
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  breakingChange: z.boolean(),
  migrationRequired: z.boolean(),
  issueRefs: z.array(z.string()).default([]),
  prRefs: z.array(z.string()).default([]),
  authorId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  publishedAt: isoTimestampSchema,
  createdAt: isoTimestampSchema,
});

export type ChangeEntry = Readonly<z.infer<typeof changeEntrySchema>>;

export const createChangeEntrySchema = changeEntrySchema.omit({
  createdAt: true,
});

export type CreateChangeEntry = Readonly<z.infer<typeof createChangeEntrySchema>>;

export function makeEntry(
  input: CreateChangeEntry,
  now: IsoTimestamp
): ChangeEntry {
  return {
    ...input,
    issueRefs: [...(input.issueRefs ?? [])],
    prRefs: [...(input.prRefs ?? [])],
    tags: [...(input.tags ?? [])],
    createdAt: now,
  };
}
