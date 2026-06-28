// types.ts: shared domain types for the fact-graph module.
import { z } from "zod";

/** Unique identifier for a graph entity node. */
export type EntityId = string & { readonly __brand: "EntityId" };

/** Unique identifier for a graph relation edge. */
export type RelationId = string & { readonly __brand: "RelationId" };

/** Unique identifier for a subject-predicate-object triple. */
export type TripleId = string & { readonly __brand: "TripleId" };

/** Unique identifier for the fact graph itself. */
export type GraphId = string & { readonly __brand: "GraphId" };

/** Supported entity types within the fact graph. */
export type EntityType =
  | "person"
  | "organization"
  | "location"
  | "event"
  | "concept"
  | "product"
  | "claim"
  | "date"
  | "quantity"
  | "unknown";

/** Supported relation/predicate types. */
export type RelationType =
  | "is_a"
  | "part_of"
  | "located_in"
  | "affiliated_with"
  | "contradicts"
  | "supports"
  | "caused_by"
  | "occurred_at"
  | "involves"
  | "referenced_by"
  | "equivalent_to"
  | "custom";

/** Provenance tracking for nodes and edges. */
export interface Provenance {
  readonly claimId?: string;
  readonly sourceId?: string;
  readonly extractedAt: string;
  readonly confidence: number;
}

/** A node in the fact graph representing a named entity or concept. */
export interface EntityNode {
  readonly id: EntityId;
  readonly type: EntityType;
  readonly label: string;
  readonly aliases: ReadonlyArray<string>;
  readonly canonicalId?: EntityId;
  readonly attributes: Readonly<Record<string, string>>;
  readonly provenance: Provenance;
}

/** A directed edge connecting two entity nodes. */
export interface RelationEdge {
  readonly id: RelationId;
  readonly subjectId: EntityId;
  readonly objectId: EntityId;
  readonly type: RelationType;
  readonly label: string;
  readonly weight: number;
  readonly provenance: Provenance;
}

/** A subject-predicate-object triple. */
export interface Triple {
  readonly id: TripleId;
  readonly subjectId: EntityId;
  readonly predicate: string;
  readonly objectId: EntityId;
  readonly confidence: number;
  readonly provenance: Provenance;
}

/** A self-contained fact graph snapshot. */
export interface FactGraph {
  readonly id: GraphId;
  readonly entities: ReadonlyArray<EntityNode>;
  readonly relations: ReadonlyArray<RelationEdge>;
  readonly triples: ReadonlyArray<Triple>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Context passed to extraction and inference operations. */
export interface GraphContext {
  readonly requestId?: string;
  readonly signal?: AbortSignal;
  readonly maxEntities?: number;
  readonly maxRelations?: number;
  readonly confidenceThreshold?: number;
}

/** Result of a graph traversal or query. */
export interface GraphQueryResult {
  readonly entities: ReadonlyArray<EntityNode>;
  readonly relations: ReadonlyArray<RelationEdge>;
  readonly triples: ReadonlyArray<Triple>;
  readonly durationMs: number;
}

/** Statistics snapshot for a fact graph. */
export interface GraphStats {
  readonly entityCount: number;
  readonly relationCount: number;
  readonly tripleCount: number;
  readonly entityTypeBreakdown: Readonly<Record<EntityType, number>>;
  readonly relationTypeBreakdown: Readonly<Record<RelationType, number>>;
  readonly avgEntityDegree: number;
}

export const entityTypeSchema = z.enum([
  "person", "organization", "location", "event", "concept",
  "product", "claim", "date", "quantity", "unknown",
]);

export const relationTypeSchema = z.enum([
  "is_a", "part_of", "located_in", "affiliated_with", "contradicts",
  "supports", "caused_by", "occurred_at", "involves", "referenced_by",
  "equivalent_to", "custom",
]);

export const provenanceSchema = z.object({
  claimId: z.string().optional(),
  sourceId: z.string().optional(),
  extractedAt: z.string(),
  confidence: z.number().min(0).max(1),
});
