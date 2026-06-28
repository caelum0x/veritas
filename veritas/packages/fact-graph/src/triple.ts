// Triple: an immutable subject-predicate-object fact extracted from a claim.

import { z } from "zod";
import { Id, newId } from "@veritas/core";
import { type EntityId } from "./entity.js";
import { type RelationId, RelationTypeSchema } from "./relation.js";

/** Unique brand for triple IDs. */
export type TripleId = Id<"triple">;
export const newTripleId = (): TripleId => newId("triple");

/** A subject-predicate-object triple referencing entity and relation IDs. */
export const TripleSchema = z.object({
  id: z.string().refine((s): s is TripleId => s.startsWith("triple_")),
  subjectId: z.string() as unknown as z.ZodType<EntityId>,
  predicate: RelationTypeSchema,
  objectId: z.string() as unknown as z.ZodType<EntityId>,
  relationId: z.string() as unknown as z.ZodType<RelationId>,
  /** The claim text segment that produced this triple. */
  span: z.string().optional(),
  confidence: z.number().min(0).max(1),
  claimId: z.string(),
  createdAt: z.string().datetime(),
});
export type Triple = z.infer<typeof TripleSchema>;

/** Factory — produces a frozen Triple. */
export function makeTriple(
  subjectId: EntityId,
  predicate: Triple["predicate"],
  objectId: EntityId,
  relationId: RelationId,
  claimId: string,
  opts: {
    id?: TripleId;
    span?: string;
    confidence?: number;
  } = {}
): Triple {
  return Object.freeze({
    id: opts.id ?? newTripleId(),
    subjectId,
    predicate,
    objectId,
    relationId,
    span: opts.span,
    confidence: opts.confidence ?? 1.0,
    claimId,
    createdAt: new Date().toISOString(),
  });
}

/** Render a human-readable string for debugging. */
export function tripleToString(triple: Triple): string {
  return `(${triple.subjectId}) --[${triple.predicate}]--> (${triple.objectId})`;
}
