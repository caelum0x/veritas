// Document metadata: structured key/value pairs attached to an ingested document.

import { z } from "zod";

export const DocumentMetadataSchema = z.object({
  /** Original filename or resource name if available. */
  filename: z.string().optional(),
  /** Author or byline extracted from the document. */
  author: z.string().nullable().optional(),
  /** Document title if distinct from the source URL title. */
  title: z.string().nullable().optional(),
  /** ISO-8601 publication date embedded in the document. */
  publishedAt: z.string().nullable().optional(),
  /** Number of pages for paginated formats (PDF, DOCX). */
  pageCount: z.number().int().min(1).optional(),
  /** Encoding used during extraction (e.g. "utf-8"). */
  encoding: z.string().optional(),
  /** MIME-specific extra fields as string key/value pairs. */
  extra: z.record(z.string()).optional(),
});

export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;

/** Merge two metadata objects, right-side values win for scalar fields. */
export function mergeMetadata(
  base: DocumentMetadata,
  override: DocumentMetadata,
): DocumentMetadata {
  return DocumentMetadataSchema.parse({
    ...base,
    ...Object.fromEntries(
      Object.entries(override).filter(([, v]) => v !== undefined && v !== null),
    ),
    extra: { ...(base.extra ?? {}), ...(override.extra ?? {}) },
  });
}

/** Convert a raw string record (e.g. from extractor) into DocumentMetadata. */
export function fromStringRecord(
  record: Record<string, string>,
): DocumentMetadata {
  const { pageCount: pageCountStr, encoding, filename, author, title, publishedAt, ...rest } =
    record;

  const pageCount =
    pageCountStr !== undefined ? parseInt(pageCountStr, 10) : undefined;

  return DocumentMetadataSchema.parse({
    filename,
    author: author ?? null,
    title: title ?? null,
    publishedAt: publishedAt ?? null,
    pageCount: pageCount !== undefined && !isNaN(pageCount) ? pageCount : undefined,
    encoding,
    extra: Object.keys(rest).length > 0 ? rest : undefined,
  });
}
