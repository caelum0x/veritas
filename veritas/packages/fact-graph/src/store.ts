// store.ts: in-memory graph store persisting entities, relations, and triples.
import { ok, err, type Result } from "@veritas/core";
import type { EntityNode, RelationEdge, Triple, FactGraph, GraphStats, EntityType, RelationType } from "./types.js";
import type { EntityId, RelationId, TripleId, GraphId } from "./types.js";
import {
  EntityNotFoundError,
  RelationNotFoundError,
  TripleNotFoundError,
  GraphCapacityError,
} from "./errors.js";

/** Port interface for the fact graph store. */
export interface GraphStore {
  putEntity(entity: EntityNode): Result<void, GraphCapacityError>;
  getEntity(id: EntityId): Result<EntityNode, EntityNotFoundError>;
  removeEntity(id: EntityId): boolean;
  listEntities(): ReadonlyArray<EntityNode>;

  putRelation(relation: RelationEdge): Result<void, GraphCapacityError>;
  getRelation(id: RelationId): Result<RelationEdge, RelationNotFoundError>;
  removeRelation(id: RelationId): boolean;
  listRelations(): ReadonlyArray<RelationEdge>;

  putTriple(triple: Triple): Result<void, GraphCapacityError>;
  getTriple(id: TripleId): Result<Triple, TripleNotFoundError>;
  removeTriple(id: TripleId): boolean;
  listTriples(): ReadonlyArray<Triple>;

  stats(): GraphStats;
  clear(): void;
  snapshot(id: GraphId, nowIso: string): FactGraph;
}

/** Options for in-memory store construction. */
export interface InMemoryGraphStoreOptions {
  readonly maxEntities?: number;
  readonly maxRelations?: number;
  readonly maxTriples?: number;
}

const DEFAULT_LIMITS = {
  maxEntities: 50_000,
  maxRelations: 200_000,
  maxTriples: 200_000,
} as const;

/** Fully in-memory implementation of GraphStore. */
export class InMemoryGraphStore implements GraphStore {
  private readonly entities = new Map<EntityId, EntityNode>();
  private readonly relations = new Map<RelationId, RelationEdge>();
  private readonly triples = new Map<TripleId, Triple>();

  private readonly maxEntities: number;
  private readonly maxRelations: number;
  private readonly maxTriples: number;

  constructor(opts: InMemoryGraphStoreOptions = {}) {
    this.maxEntities = opts.maxEntities ?? DEFAULT_LIMITS.maxEntities;
    this.maxRelations = opts.maxRelations ?? DEFAULT_LIMITS.maxRelations;
    this.maxTriples = opts.maxTriples ?? DEFAULT_LIMITS.maxTriples;
  }

  putEntity(entity: EntityNode): Result<void, GraphCapacityError> {
    if (!this.entities.has(entity.id) && this.entities.size >= this.maxEntities) {
      return err(new GraphCapacityError(this.maxEntities, "entities"));
    }
    this.entities.set(entity.id, entity);
    return ok(undefined);
  }

  getEntity(id: EntityId): Result<EntityNode, EntityNotFoundError> {
    const entity = this.entities.get(id);
    if (entity === undefined) return err(new EntityNotFoundError(id));
    return ok(entity);
  }

  removeEntity(id: EntityId): boolean {
    return this.entities.delete(id);
  }

  listEntities(): ReadonlyArray<EntityNode> {
    return Array.from(this.entities.values());
  }

  putRelation(relation: RelationEdge): Result<void, GraphCapacityError> {
    if (!this.relations.has(relation.id) && this.relations.size >= this.maxRelations) {
      return err(new GraphCapacityError(this.maxRelations, "relations"));
    }
    this.relations.set(relation.id, relation);
    return ok(undefined);
  }

  getRelation(id: RelationId): Result<RelationEdge, RelationNotFoundError> {
    const relation = this.relations.get(id);
    if (relation === undefined) return err(new RelationNotFoundError(id));
    return ok(relation);
  }

  removeRelation(id: RelationId): boolean {
    return this.relations.delete(id);
  }

  listRelations(): ReadonlyArray<RelationEdge> {
    return Array.from(this.relations.values());
  }

  putTriple(triple: Triple): Result<void, GraphCapacityError> {
    if (!this.triples.has(triple.id) && this.triples.size >= this.maxTriples) {
      return err(new GraphCapacityError(this.maxTriples, "triples"));
    }
    this.triples.set(triple.id, triple);
    return ok(undefined);
  }

  getTriple(id: TripleId): Result<Triple, TripleNotFoundError> {
    const triple = this.triples.get(id);
    if (triple === undefined) return err(new TripleNotFoundError(id));
    return ok(triple);
  }

  removeTriple(id: TripleId): boolean {
    return this.triples.delete(id);
  }

  listTriples(): ReadonlyArray<Triple> {
    return Array.from(this.triples.values());
  }

  stats(): GraphStats {
    const entityTypeBreakdown = buildTypeBreakdown<EntityType>(
      this.entities,
      (e) => e.type,
    );
    const relationTypeBreakdown = buildTypeBreakdown<RelationType>(
      this.relations,
      (r) => r.type,
    );

    const degree = computeAvgDegree(this.entities, this.relations);

    return {
      entityCount: this.entities.size,
      relationCount: this.relations.size,
      tripleCount: this.triples.size,
      entityTypeBreakdown,
      relationTypeBreakdown,
      avgEntityDegree: degree,
    };
  }

  clear(): void {
    this.entities.clear();
    this.relations.clear();
    this.triples.clear();
  }

  snapshot(id: GraphId, nowIso: string): FactGraph {
    return {
      id,
      entities: this.listEntities(),
      relations: this.listRelations(),
      triples: this.listTriples(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }
}

function buildTypeBreakdown<K extends string>(
  map: Map<unknown, { readonly type: K }>,
  getType: (v: { readonly type: K }) => K,
): Readonly<Record<K, number>> {
  const result = {} as Record<K, number>;
  for (const value of map.values()) {
    const t = getType(value);
    result[t] = (result[t] ?? 0) + 1;
  }
  return result;
}

function computeAvgDegree(
  entities: Map<EntityId, EntityNode>,
  relations: Map<RelationId, RelationEdge>,
): number {
  if (entities.size === 0) return 0;
  const degree = new Map<EntityId, number>();
  for (const id of entities.keys()) {
    degree.set(id, 0);
  }
  for (const rel of relations.values()) {
    degree.set(rel.subjectId, (degree.get(rel.subjectId) ?? 0) + 1);
    degree.set(rel.objectId, (degree.get(rel.objectId) ?? 0) + 1);
  }
  const total = Array.from(degree.values()).reduce((s, d) => s + d, 0);
  return total / entities.size;
}
