// Entity node: a named real-world concept extracted from a claim.

import { z } from "zod";
import { Id, newId, ContentHash } from "@veritas/core";

/** Supported entity types in the fact graph. */
export const EntityTypeSchema = z.enum([
  "person",
  "organization",
  "location",
  "date",
  "number",
  "event",
  "product",
  "concept",
  "unknown",
]);
export type EntityType = z.infer<typeof EntityTypeSchema>;

/** Unique brand for entity IDs. */
export type EntityId = Id<"entity">;
export const newEntityId = (): EntityId => newId("entity");

/** A canonical entity node in the fact graph. */
export const EntitySchema = z.object({
  id: z.string().refine((s): s is EntityId => s.startsWith("entity_")),
  label: z.string().min(1),
  type: EntityTypeSchema,
  aliases: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  contentHash: z.string() as z.ZodType<ContentHash>,
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Entity = z.infer<typeof EntitySchema>;

/** Factory — produces a frozen Entity so the graph stays immutable. */
export function makeEntity(
  label: string,
  type: EntityType,
  opts: {
    id?: EntityId;
    aliases?: readonly string[];
    confidence?: number;
    contentHash?: ContentHash;
    metadata?: Record<string, unknown>;
  } = {}
): Entity {
  const now = new Date().toISOString();
  return Object.freeze({
    id: opts.id ?? newEntityId(),
    label,
    type,
    aliases: [...(opts.aliases ?? [])],
    confidence: opts.confidence ?? 1.0,
    contentHash: opts.contentHash ?? ("" as ContentHash),
    metadata: { ...(opts.metadata ?? {}) },
    createdAt: now,
    updatedAt: now,
  });
}

/** Return a new Entity with updated fields (immutable update). */
export function updateEntity(
  entity: Entity,
  patch: Partial<Pick<Entity, "label" | "type" | "aliases" | "confidence" | "metadata">>
): Entity {
  return Object.freeze({
    ...entity,
    ...patch,
    aliases: patch.aliases ? [...patch.aliases] : [...entity.aliases],
    metadata: patch.metadata
      ? { ...entity.metadata, ...patch.metadata }
      : { ...entity.metadata },
    updatedAt: new Date().toISOString(),
  });
}
