// merge.ts: deduplicate and merge entity nodes by canonical key (type + label).

import type { Entity } from "./entity.js";

/** A pair of entity ids that are candidates for merging. */
export interface MergeCandidate {
  readonly entityAId: string;
  readonly entityBId: string;
  readonly similarityScore: number;
  readonly reason: string;
}

/** The result of a merge operation. */
export interface MergeResult {
  readonly merged: Entity;
  readonly removedId: string;
  readonly aliasesAdded: ReadonlyArray<string>;
}

/** Merge two entities; target retains its id, aliases are unioned. */
export function mergeEntities(target: Entity, source: Entity): MergeResult {
  const aliasSet = new Set([...target.aliases, ...source.aliases, source.label]);
  aliasSet.delete(target.label);
  const aliasesAdded = Array.from(aliasSet).filter((a) => !target.aliases.includes(a));
  const merged = Object.freeze({
    ...target,
    aliases: Array.from(aliasSet),
    confidence: Math.max(target.confidence, source.confidence),
    metadata: { ...source.metadata, ...target.metadata },
    updatedAt: new Date().toISOString(),
  }) as Entity;
  return Object.freeze({ merged, removedId: source.id, aliasesAdded });
}

/** Build a canonical dedup key: entity type + normalised label. */
function canonicalKey(entity: Entity): string {
  return `${entity.type}::${entity.label.toLowerCase().trim()}`;
}

/** Deduplicate an array of entities, merging those sharing the same canonical key. */
export function deduplicateEntities(entities: ReadonlyArray<Entity>): ReadonlyArray<Entity> {
  const byKey = new Map<string, Entity>();
  for (const entity of entities) {
    const key = canonicalKey(entity);
    const existing = byKey.get(key);
    if (existing) {
      byKey.set(key, mergeEntities(existing, entity).merged);
    } else {
      byKey.set(key, entity);
    }
  }
  return Object.freeze(Array.from(byKey.values()));
}

/** Build a map from alias/label (normalised) → entity id for fast lookup. */
export function buildAliasIndex(
  entities: ReadonlyArray<Entity>,
): ReadonlyMap<string, string> {
  const index = new Map<string, string>();
  for (const entity of entities) {
    index.set(entity.label.toLowerCase().trim(), entity.id);
    for (const alias of entity.aliases) {
      index.set(alias.toLowerCase().trim(), entity.id);
    }
  }
  return index;
}

/** Resolve a raw entity id to its canonical id using the alias index. */
export function resolveEntityId(
  raw: string,
  aliasIndex: ReadonlyMap<string, string>,
): string {
  return aliasIndex.get(raw.toLowerCase().trim()) ?? raw;
}

/** Identify merge candidates by finding entities with the same canonical key. */
export function findMergeCandidates(
  entities: ReadonlyArray<Entity>,
): ReadonlyArray<MergeCandidate> {
  const byKey = new Map<string, Entity[]>();
  for (const entity of entities) {
    const key = canonicalKey(entity);
    const group = byKey.get(key);
    if (group) {
      group.push(entity);
    } else {
      byKey.set(key, [entity]);
    }
  }
  const candidates: MergeCandidate[] = [];
  for (const group of byKey.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        candidates.push({
          entityAId: group[i]!.id,
          entityBId: group[j]!.id,
          similarityScore: 1.0,
          reason: `Same canonical key: ${canonicalKey(group[i]!)}`,
        });
      }
    }
  }
  return Object.freeze(candidates);
}
