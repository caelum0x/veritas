// StoredObject — metadata descriptor for a persisted blob object.
import { z } from "zod";

export const StoredObjectSchema = z.object({
  key: z.string().min(1),
  size: z.number().int().nonnegative(),
  contentType: z.string().default("application/octet-stream"),
  etag: z.string(),
  lastModified: z.date(),
  metadata: z.record(z.string()).default({}),
  versionId: z.string().optional(),
  storageClass: z.string().optional(),
});

export type StoredObject = z.infer<typeof StoredObjectSchema>;

export function makeStoredObject(
  key: string,
  size: number,
  etag: string,
  contentType = "application/octet-stream",
  metadata: Record<string, string> = {},
  lastModified: Date = new Date(),
  versionId?: string,
): StoredObject {
  return {
    key,
    size,
    contentType,
    etag,
    lastModified,
    metadata,
    versionId,
  };
}
