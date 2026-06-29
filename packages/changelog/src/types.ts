// Shared types and schemas for the changelog module.
import { z } from "zod";

export const renderFormatSchema = z.enum(["markdown", "html", "json", "rss"]);
export type RenderFormat = z.infer<typeof renderFormatSchema>;

export const feedFormatSchema = z.enum(["rss", "atom"]);
export type FeedFormat = z.infer<typeof feedFormatSchema>;

export const changelogFilterSchema = z.object({
  version: z.string().optional(),
  categories: z.array(z.string()).optional(),
  breakingOnly: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  limit: z.number().int().positive().max(500).optional(),
  offset: z.number().int().min(0).optional(),
});
export type ChangelogFilter = Readonly<z.infer<typeof changelogFilterSchema>>;

export const feedMetaSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  link: z.string().url(),
  feedLink: z.string().url(),
  language: z.string().default("en"),
  copyright: z.string().optional(),
  managingEditor: z.string().optional(),
  webMaster: z.string().optional(),
  ttl: z.number().int().positive().optional(),
});
export type FeedMeta = Readonly<z.infer<typeof feedMetaSchema>>;

export const renderOptionsSchema = z.object({
  format: renderFormatSchema.default("markdown"),
  includeBreakingNotices: z.boolean().default(true),
  includeMigrationNotes: z.boolean().default(true),
  includeIssueRefs: z.boolean().default(true),
  includePrRefs: z.boolean().default(true),
  baseIssueUrl: z.string().url().optional(),
  basePrUrl: z.string().url().optional(),
  maxEntriesPerVersion: z.number().int().positive().optional(),
});
export type RenderOptions = Readonly<z.infer<typeof renderOptionsSchema>>;
