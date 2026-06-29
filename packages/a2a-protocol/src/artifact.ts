// A2A artifact: typed output artifact produced or consumed by a task.

import { z } from "zod";

export const A2AArtifactKindSchema = z.enum([
  "text",
  "json",
  "binary",
  "url",
  "verification-report",
  "claim-set",
  "citation-list",
]);
export type A2AArtifactKind = z.infer<typeof A2AArtifactKindSchema>;

export const A2AArtifactSchema = z.object({
  /** Unique artifact identifier. */
  id: z.string().min(1),
  /** Task that produced this artifact. */
  taskId: z.string().min(1),
  /** Semantic kind of artifact. */
  kind: A2AArtifactKindSchema,
  /** Human-readable artifact name. */
  name: z.string().min(1),
  /** MIME type of the artifact content. */
  mimeType: z.string().min(1).default("application/octet-stream"),
  /** Inline payload (for text / json / small binary as base64). */
  inlineData: z.string().optional(),
  /** External URL where the artifact can be fetched. */
  url: z.string().url().optional(),
  /** SHA-256 hex content hash for integrity verification. */
  contentHash: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  /** Byte size of the artifact (informational). */
  sizeBytes: z.number().int().nonnegative().optional(),
  /** ISO-8601 creation timestamp. */
  createdAt: z.string().datetime({ offset: true }),
  /** Arbitrary JSON-safe metadata. */
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type A2AArtifact = z.infer<typeof A2AArtifactSchema>;

export const CreateA2AArtifactSchema = A2AArtifactSchema.omit({ id: true, createdAt: true });
export type CreateA2AArtifact = z.infer<typeof CreateA2AArtifactSchema>;

/** Return true when the artifact has resolvable content (inline or remote). */
export function hasContent(artifact: A2AArtifact): boolean {
  return artifact.inlineData !== undefined || artifact.url !== undefined;
}
