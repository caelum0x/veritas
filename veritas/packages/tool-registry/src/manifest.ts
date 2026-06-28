// Tool manifest: serialisable snapshot of all registered tools for distribution.

import { z } from "zod";
import { ContentHash, contentHash, canonicalize } from "@veritas/core";
import { ToolCategorySchema } from "./category.js";
import { semVerSchema } from "./versioning.js";
import { toolParamSchema } from "./types.js";

/** Minimal descriptor shape embedded in the manifest (subset of full descriptor). */
export const manifestEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: semVerSchema,
  category: ToolCategorySchema,
  description: z.string(),
  inputParams: z.array(toolParamSchema),
  outputParams: z.array(toolParamSchema),
  requiredPermissions: z.array(z.string()),
  deprecated: z.boolean(),
  tags: z.array(z.string()),
});

export type ManifestEntry = z.infer<typeof manifestEntrySchema>;

/** Full manifest document bundling all tool entries with provenance metadata. */
export const toolManifestSchema = z.object({
  schemaVersion: z.literal("1.0"),
  generatedAt: z.string(),
  toolCount: z.number().int().nonnegative(),
  contentHash: z.string(),
  tools: z.array(manifestEntrySchema),
});

export type ToolManifest = z.infer<typeof toolManifestSchema>;

/** Build a manifest from a list of entries, stamping the content hash. */
export function buildManifest(
  entries: ReadonlyArray<ManifestEntry>,
  now: string
): ToolManifest {
  const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id));
  const hash: ContentHash = contentHash(canonicalize(sorted));
  return {
    schemaVersion: "1.0",
    generatedAt: now,
    toolCount: sorted.length,
    contentHash: hash,
    tools: sorted,
  };
}

/** Verify that a manifest's content hash matches its tools payload. */
export function verifyManifest(manifest: ToolManifest): boolean {
  const expected = contentHash(canonicalize([...manifest.tools].sort((a, b) => a.id.localeCompare(b.id))));
  return expected === manifest.contentHash;
}
