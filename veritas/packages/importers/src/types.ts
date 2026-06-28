// Shared types for the importers package.

import { z } from "zod";
import type { RawItem, ImporterConfig } from "./importer.js";

/** Supported importer kinds. */
export type ImporterKind = "csv" | "rss" | "sitemap" | "api" | "json";

/** Zod schema for importer kind. */
export const importerKindSchema = z.enum(["csv", "rss", "sitemap", "api", "json"]);

/** Source feed descriptor stored in a registry entry. */
export interface ImporterEntry {
  readonly id: string;
  readonly kind: ImporterKind;
  readonly sourceUrl: string;
  readonly config: ImporterConfig;
  readonly enabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Zod schema for ImporterEntry. */
export const importerEntrySchema = z.object({
  id: z.string().min(1),
  kind: importerKindSchema,
  sourceUrl: z.string().url(),
  config: z.object({
    name: z.string().min(1),
    maxItems: z.number().int().nonnegative().optional(),
  }),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** Parameters for registering a new importer source. */
export interface RegisterSourceParams {
  readonly kind: ImporterKind;
  readonly sourceUrl: string;
  readonly config: ImporterConfig;
}

/** Zod schema for RegisterSourceParams. */
export const registerSourceParamsSchema = z.object({
  kind: importerKindSchema,
  sourceUrl: z.string().url(),
  config: z.object({
    name: z.string().min(1),
    maxItems: z.number().int().nonnegative().optional(),
  }),
});

/** Metadata attached to a deduplicated item. */
export interface DedupeRecord {
  readonly contentHash: string;
  readonly url: string;
  readonly seenAt: string;
}

/** Options controlling polite rate control. */
export interface RateControlOptions {
  /** Minimum milliseconds between requests to the same host. */
  readonly minDelayMs: number;
  /** Maximum concurrent requests across all hosts. */
  readonly maxConcurrency: number;
}

/** Result of a mapping step converting a RawItem to a domain claim shape. */
export interface MappedClaim {
  readonly text: string;
  readonly sourceUrl: string;
  readonly publisher: string | null;
  readonly publishedAt: string | null;
  readonly rawItem: RawItem;
}
