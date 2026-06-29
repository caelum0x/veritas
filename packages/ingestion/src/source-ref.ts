// Source reference: lightweight pointer to an external content origin (URL + optional metadata).

import { z } from "zod";
import { sourceTierSchema } from "@veritas/core";

export const SourceRefSchema = z.object({
  url: z.string().url(),
  mimeType: z.string().optional(),
  title: z.string().nullable().optional(),
  publisher: z.string().nullable().optional(),
  tier: sourceTierSchema.optional(),
  publishedAt: z.string().nullable().optional(),
  fetchedAt: z.string().optional(),
  headers: z.record(z.string()).optional(),
});

export type SourceRef = z.infer<typeof SourceRefSchema>;

export function makeSourceRef(
  url: string,
  overrides?: Partial<Omit<SourceRef, "url">>
): SourceRef {
  return SourceRefSchema.parse({ url, ...overrides });
}
