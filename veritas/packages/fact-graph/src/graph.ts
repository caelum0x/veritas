// FactGraph: immutable adjacency structure holding entities, relations, and triples.

import { Result, ok, err } from "@veritas/core";
import { type Entity, type EntityId } from "./entity.js";
import { type Relation, type RelationId } from "./relation.js";
import { type Triple, type TripleId } from "./triple.js";

/** Snapshot of the entire fact graph — all maps are read-only. */
export interface FactGraph {
  readonly entities: ReadonlyMap<EntityId, Entity>;
  readonly relations: ReadonlyMap<RelationId, Relation>;
  readonly triples: ReadonlyMap<TripleId, Triple>;
  /** Adjacency index: entity → outgoing relation IDs. */
  readonly outgoing: ReadonlyMap<EntityId, ReadonlySet<RelationId>>;
  /** Adjacency index: entity → incoming relation IDs. */
  readonly incoming: ReadonlyMap<EntityId, ReadonlySet<RelationId>>;
}

/** Internal mutable builder used only within this module. */
interface MutableGraph {
  entities: Map<EntityId, Entity>;
  relations: Map<RelationId, Relation>;
  triples: Map<TripleId, Triple>;
  outgoing: Map<EntityId, Set<RelationId>>;
  incoming: Map<EntityId, Set<RelationId>>;
}

function emptyMutable(): MutableGraph {
  return {
    entities: new Map(),
    relations: new Map(),
    triples: new Map(),
    outgoing: new Map(),
    incoming: new Map(),
  };
}

function freeze(g: MutableGraph): FactGraph {
  return Object.freeze({
    entities: g.entities,
    relations: g.relations,
    triples: g.triples,
    outgoing: g.outgoing,
    incoming: g.incoming,
  });
}

/** Create an empty FactGraph. */
export function emptyGraph(): FactGraph {
  return freeze(emptyMutable());
}

/** Return a new FactGraph with an entity added (immutable). */
export function addEntity(graph: FactGraph, entity: Entity): Result<FactGraph> {
  if (graph.entities.has(entity.id)) {
    return err(new Error(`Entity already exists: ${entity.id}`));
  }
  const next: MutableGraph = {
    entities: new Map(graph.entities).set(entity.id, entity),
    relations: new Map(graph.relations),
    triples: new Map(graph.triples),
    outgoing: new Map(graph.outgoing) as Map<EntityId, Set<RelationId>>,
    incoming: new Map(graph.incoming) as Map<EntityId, Set<RelationId>>,
  };
  return ok(freeze(next));
}

/** Return a new FactGraph with a relation added (immutable). */
export function addRelation(graph: FactGraph, relation: Relation): Result<FactGraph> {
  if (!graph.entities.has(relation.sourceId)) {
    return err(new Error(`Source entity not found: ${relation.sourceId}`));
  }
  if (!graph.entities.has(relation.targetId)) {
    return err(new Error(`Target entity not found: ${relation.targetId}`));
  }
  if (graph.relations.has(relation.id)) {
    return err(new Error(`Relation already exists: ${relation.id}`));
  }

  const nextOutgoing = new Map(graph.outgoing);
  const srcSet = new Set(nextOutgoing.get(relation.sourceId) ?? []);
  srcSet.add(relation.id);
  nextOutgoing.set(relation.sourceId, srcSet);

  const nextIncoming = new Map(graph.incoming);
  const tgtSet = new Set(nextIncoming.get(relation.targetId) ?? []);
  tgtSet.add(relation.id);
  nextIncoming.set(relation.targetId, tgtSet);

  const next: MutableGraph = {
    entities: new Map(graph.entities),
    relations: new Map(graph.relations).set(relation.id, relation),
    triples: new Map(graph.triples),
    outgoing: nextOutgoing as Map<EntityId, Set<RelationId>>,
    incoming: nextIncoming as Map<EntityId, Set<RelationId>>,
  };
  return ok(freeze(next));
}

/** Return a new FactGraph with a triple added (immutable). */
export function addTriple(graph: FactGraph, triple: Triple): Result<FactGraph> {
  if (graph.triples.has(triple.id)) {
    return err(new Error(`Triple already exists: ${triple.id}`));
  }
  const next: MutableGraph = {
    entities: new Map(graph.entities),
    relations: new Map(graph.relations),
    triples: new Map(graph.triples).set(triple.id, triple),
    outgoing: new Map(graph.outgoing) as Map<EntityId, Set<RelationId>>,
    incoming: new Map(graph.incoming) as Map<EntityId, Set<RelationId>>,
  };
  return ok(freeze(next));
}

/** Bulk-add entities, relations, and triples; returns final graph or first error. */
export function buildGraph(
  base: FactGraph,
  entities: readonly Entity[],
  relations: readonly Relation[],
  triples: readonly Triple[]
): Result<FactGraph> {
  let g = base;

  for (const e of entities) {
    if (g.entities.has(e.id)) continue; // skip duplicates gracefully
    const r = addEntity(g, e);
    if (r.ok === false) return r;
    g = r.value;
  }

  for (const rel of relations) {
    if (g.relations.has(rel.id)) continue;
    const r = addRelation(g, rel);
    if (r.ok === false) return r;
    g = r.value;
  }

  for (const t of triples) {
    if (g.triples.has(t.id)) continue;
    const r = addTriple(g, t);
    if (r.ok === false) return r;
    g = r.value;
  }

  return ok(g);
}

/** Return all relations between two specific entities (any direction). */
export function relationsBetween(
  graph: FactGraph,
  entityA: EntityId,
  entityB: EntityId
): readonly Relation[] {
  const outIds = graph.outgoing.get(entityA) ?? new Set<RelationId>();
  return [...outIds]
    .map((id) => graph.relations.get(id))
    .filter((r): r is Relation => r !== undefined && r.targetId === entityB);
}

/** Return statistics about the graph. */
export function graphStats(graph: FactGraph): {
  entityCount: number;
  relationCount: number;
  tripleCount: number;
} {
  return {
    entityCount: graph.entities.size,
    relationCount: graph.relations.size,
    tripleCount: graph.triples.size,
  };
}
