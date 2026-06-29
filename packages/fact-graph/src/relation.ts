// Relation edge: a typed, directed connection between two entity nodes.

import { z } from "zod";
import { Id, newId } from "@veritas/core";
import { type EntityId } from "./entity.js";

/** Supported semantic relation types. */
export const RelationTypeSchema = z.enum([
  "claims",
  "contradicts",
  "supports",
  "mentions",
  "causes",
  "partOf",
  "instanceOf",
  "locatedIn",
  "occursAt",
  "relatedTo",
]);
export type RelationType = z.infer<typeof RelationTypeSchema>;

/** Unique brand for relation IDs. */
export type RelationId = Id<"relation">;
export const newRelationId = (): RelationId => newId("relation");

/** A directed, weighted edge between two entity nodes. */
export const RelationSchema = z.object({
  id: z.string().refine((s): s is RelationId => s.startsWith("relation_")),
  sourceId: z.string() as unknown as z.ZodType<EntityId>,
  targetId: z.string() as unknown as z.ZodType<EntityId>,
  type: RelationTypeSchema,
  weight: z.number().min(0).max(1),
  label: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
});
export type Relation = z.infer<typeof RelationSchema>;

/** Factory — produces a frozen Relation. */
export function makeRelation(
  sourceId: EntityId,
  targetId: EntityId,
  type: RelationType,
  opts: {
    id?: RelationId;
    weight?: number;
    label?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Relation {
  return Object.freeze({
    id: opts.id ?? newRelationId(),
    sourceId,
    targetId,
    type,
    weight: opts.weight ?? 1.0,
    label: opts.label,
    metadata: { ...(opts.metadata ?? {}) },
    createdAt: new Date().toISOString(),
  });
}

/** Return a new Relation with patched weight or metadata (immutable update). */
export function updateRelation(
  relation: Relation,
  patch: Partial<Pick<Relation, "weight" | "label" | "metadata">>
): Relation {
  return Object.freeze({
    ...relation,
    ...patch,
    metadata: patch.metadata
      ? { ...relation.metadata, ...patch.metadata }
      : { ...relation.metadata },
  });
}
