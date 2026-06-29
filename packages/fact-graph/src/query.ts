// query.ts: graph traversal and filtering queries over a FactGraph.

import type { Entity } from "./entity.js";
import type { Relation } from "./relation.js";
import type { Triple } from "./triple.js";
import type { EntityType, RelationType } from "./types.js";

/** Input parameters for a graph query. */
export interface GraphQuery {
  /** Filter entities by type. */
  readonly entityTypes?: ReadonlyArray<EntityType>;
  /** Filter entities whose label contains this substring (case-insensitive). */
  readonly labelContains?: string;
  /** Only return relations of these types. */
  readonly relationTypes?: ReadonlyArray<RelationType>;
  /** Return triples whose subject is one of these entity ids. */
  readonly subjectIds?: ReadonlyArray<string>;
  /** Return triples whose object is one of these entity ids. */
  readonly objectIds?: ReadonlyArray<string>;
  /** Minimum confidence for entities, relations, and triples. */
  readonly minConfidence?: number;
  /** Maximum number of results per collection. */
  readonly limit?: number;
}

/** Projection of query results. */
export interface QueryResult {
  readonly entities: ReadonlyArray<Entity>;
  readonly relations: ReadonlyArray<Relation>;
  readonly triples: ReadonlyArray<Triple>;
  readonly durationMs: number;
}

/** Inputs needed to execute a query (separate from a full FactGraph to keep this pure). */
export interface GraphQueryInputs {
  readonly entities: ReadonlyArray<Entity>;
  readonly relations: ReadonlyArray<Relation>;
  readonly triples: ReadonlyArray<Triple>;
}

/** Execute a declarative query against a set of graph collections. */
export function queryGraph(
  graph: GraphQueryInputs,
  query: GraphQuery,
): QueryResult {
  const start = Date.now();
  const limit = query.limit ?? Infinity;
  const minConf = query.minConfidence ?? 0;

  const entities = graph.entities
    .filter((e) => {
      if (e.confidence < minConf) return false;
      if (query.entityTypes && !query.entityTypes.includes(e.type as EntityType)) return false;
      if (
        query.labelContains &&
        !e.label.toLowerCase().includes(query.labelContains.toLowerCase())
      )
        return false;
      return true;
    })
    .slice(0, limit);

  const entityIds = new Set(entities.map((e) => e.id));

  const relations = graph.relations
    .filter((r) => {
      if (query.relationTypes && !query.relationTypes.includes(r.type as RelationType)) return false;
      if (query.minConfidence !== undefined) {
        // Relation weight acts as confidence proxy
        if (r.weight < minConf) return false;
      }
      // Only include relations where both endpoints are in the filtered entity set
      if (!entityIds.has(r.sourceId) || !entityIds.has(r.targetId)) return false;
      return true;
    })
    .slice(0, limit);

  const relationIds = new Set(relations.map((r) => r.id));

  const triples = graph.triples
    .filter((t) => {
      if (t.confidence < minConf) return false;
      if (!relationIds.has(t.relationId)) return false;
      if (query.subjectIds && !query.subjectIds.includes(t.subjectId)) return false;
      if (query.objectIds && !query.objectIds.includes(t.objectId)) return false;
      return true;
    })
    .slice(0, limit);

  return Object.freeze({
    entities: Object.freeze(entities),
    relations: Object.freeze(relations),
    triples: Object.freeze(triples),
    durationMs: Date.now() - start,
  });
}

/** Return all entity ids reachable from startId by following outgoing relations (BFS). */
export function reachableFrom(
  startId: string,
  relations: ReadonlyArray<Relation>,
  maxDepth = 5,
): ReadonlySet<string> {
  const visited = new Set<string>([startId]);
  const frontier = [startId];
  let depth = 0;
  while (frontier.length > 0 && depth < maxDepth) {
    const next: string[] = [];
    for (const nodeId of frontier) {
      for (const r of relations) {
        if (r.sourceId === nodeId && !visited.has(r.targetId)) {
          visited.add(r.targetId);
          next.push(r.targetId);
        }
      }
    }
    frontier.splice(0, frontier.length, ...next);
    depth++;
  }
  return visited;
}

/** Return a subgraph induced by the given entity ids. */
export function inducedSubgraph(
  entityIds: ReadonlyArray<string>,
  graph: GraphQueryInputs,
): GraphQueryInputs {
  const idSet = new Set(entityIds);
  const entities = graph.entities.filter((e) => idSet.has(e.id));
  const relations = graph.relations.filter(
    (r) => idSet.has(r.sourceId) && idSet.has(r.targetId),
  );
  const relationIds = new Set(relations.map((r) => r.id));
  const triples = graph.triples.filter((t) => relationIds.has(t.relationId));
  return { entities, relations, triples };
}
