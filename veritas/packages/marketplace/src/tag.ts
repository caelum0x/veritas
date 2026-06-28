// Tag entity: free-form labels applied to marketplace listings for cross-cutting discovery.

import { z } from "zod";
import { newId, type Id, type IsoTimestamp, epochToIso, slugify } from "@veritas/core";

/** Branded id for tags. */
export type TagId = Id<"tag">;

export const newTagId = (): TagId => newId("tag");

/** Immutable tag entity. */
export interface Tag {
  readonly id: TagId;
  readonly slug: string;
  readonly label: string;
  readonly usageCount: number;
  readonly createdAt: IsoTimestamp;
}

export const createTagSchema = z.object({
  label: z.string().min(1).max(60),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;

/** Factory: build a Tag from a label (slug is auto-derived). */
export function createTag(input: CreateTagInput): Tag {
  const now = epochToIso(Date.now());
  return {
    id: newTagId(),
    slug: slugify(input.label),
    label: input.label.trim(),
    usageCount: 0,
    createdAt: now,
  };
}

/** Return a new Tag with usageCount incremented by delta (default 1). */
export function incrementTagUsage(tag: Tag, delta = 1): Tag {
  return { ...tag, usageCount: Math.max(0, tag.usageCount + delta) };
}

/** Return a new Tag with usageCount decremented by 1 (minimum 0). */
export function decrementTagUsage(tag: Tag): Tag {
  return incrementTagUsage(tag, -1);
}

/** Normalise a raw label to the canonical slug used for deduplication. */
export function normalizeTagLabel(label: string): string {
  return slugify(label.trim());
}

/** Return tags sorted by usageCount descending, then label ascending. */
export function sortTagsByPopularity(tags: readonly Tag[]): Tag[] {
  return [...tags].sort((a, b) => {
    if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
    return a.label.localeCompare(b.label);
  });
}

/** Deduplicate a list of tags by slug, keeping the one with higher usageCount. */
export function deduplicateTags(tags: readonly Tag[]): Tag[] {
  const map = new Map<string, Tag>();
  for (const tag of tags) {
    const existing = map.get(tag.slug);
    if (!existing || tag.usageCount > existing.usageCount) {
      map.set(tag.slug, tag);
    }
  }
  return Array.from(map.values());
}
