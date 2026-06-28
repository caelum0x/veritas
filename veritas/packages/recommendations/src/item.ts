// Recommendable item — wraps a domain entity with embedding and metadata for recommendations.

import { z } from "zod";
import type { Vector } from "@veritas/embeddings";

export const ItemKindSchema = z.enum(["agent", "source", "claim", "report"]);
export type ItemKind = z.infer<typeof ItemKindSchema>;

export const RecommendableItemSchema = z.object({
  id: z.string().min(1),
  kind: ItemKindSchema,
  title: z.string().min(1),
  description: z.string().default(""),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type RecommendableItem = z.infer<typeof RecommendableItemSchema> & {
  readonly embedding?: Vector;
};

export function makeItem(
  fields: Omit<RecommendableItem, "embedding"> & { embedding?: Vector }
): RecommendableItem {
  const parsed = RecommendableItemSchema.parse(fields);
  return fields.embedding !== undefined
    ? { ...parsed, embedding: fields.embedding }
    : parsed;
}

export function withEmbedding(
  item: RecommendableItem,
  embedding: Vector
): RecommendableItem {
  return { ...item, embedding };
}

export function hasEmbedding(
  item: RecommendableItem
): item is RecommendableItem & { embedding: Vector } {
  return item.embedding !== undefined;
}
