// Public surface of @veritas/fact-graph: entities, relations, triples, graph, and supporting ops.

export type { EntityId, EntityType, Entity } from "./entity.js";
export { EntityTypeSchema, EntitySchema, newEntityId, makeEntity, updateEntity } from "./entity.js";

export type { RelationId, RelationType, Relation } from "./relation.js";
export { RelationTypeSchema, RelationSchema, newRelationId, makeRelation, updateRelation } from "./relation.js";

export type { TripleId, Triple } from "./triple.js";
export { TripleSchema, newTripleId, makeTriple } from "./triple.js";

export type { ExtractorPort, ExtractionResult } from "./extractor.js";
export { ExtractionResultSchema, MockExtractorAdapter } from "./extractor.js";

export type { FactGraph } from "./graph.js";
export { emptyGraph, addEntity, addRelation, addTriple, buildGraph, relationsBetween, graphStats } from "./graph.js";

export type { MergeCandidate, MergeResult } from "./merge.js";
export { findMergeCandidates, mergeEntities } from "./merge.js";

export type { LinkerPort, LinkResult } from "./linker.js";
export { mockLinker, linkEntities } from "./linker.js";

export type { GraphQuery, QueryResult } from "./query.js";
export { queryGraph } from "./query.js";

export type { InferenceRule, InferenceResult } from "./inference.js";
export { applyInferenceRules, builtinRules } from "./inference.js";

export type { ContradictionLink } from "./contradiction-link.js";
export { makeContradictionLink, detectContradictions } from "./contradiction-link.js";

export type { GraphStore } from "./store.js";
export { InMemoryGraphStore } from "./store.js";

export type { ExportFormat, ExportResult } from "./export.js";
export { exportGraph } from "./export.js";

export type { CanonicalForm, CanonicalizationOptions } from "./canonical-entity.js";
export { canonicalizeLabel, labelSimilarity, selectCanonical, groupByFingerprint, resolveAliases, areAliasEquivalent, mergeAliases, buildCanonicalMap } from "./canonical-entity.js";

export {
  EntityNotFoundError,
  RelationNotFoundError,
  TripleNotFoundError,
  GraphNotFoundError,
  ExtractionError,
  MergeConflictError,
  LinkingError,
  InferenceError,
  GraphCapacityError,
  ExportError,
  CanonicalizationError,
} from "./errors.js";

export type {
  EntityNode,
  RelationEdge,
  GraphId,
  GraphContext,
  GraphQueryResult,
  GraphStats,
  Provenance,
} from "./types.js";
