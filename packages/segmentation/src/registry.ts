// Segment registry — central store for segment definitions keyed by SegmentId.
import { type Result, ok, err, newId } from "@veritas/core";
import { SegmentId, SegmentIdSchema, SegmentKind, SegmentStats, QueryFilter } from "./types.js";
import { SegmentNotFoundError, SegmentConflictError } from "./errors.js";
import { RuleGroup } from "./rule.js";
import { matchesFilter } from "./query.js";

export interface SegmentDefinition {
  readonly id: SegmentId;
  readonly name: string;
  readonly description: string;
  readonly kind: SegmentKind;
  readonly tags: ReadonlyArray<string>;
  readonly rules: RuleGroup | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateSegmentInput {
  readonly name: string;
  readonly description?: string;
  readonly kind: SegmentKind;
  readonly tags?: ReadonlyArray<string>;
  readonly rules?: RuleGroup | null;
}

export interface UpdateSegmentInput {
  readonly name?: string;
  readonly description?: string;
  readonly tags?: ReadonlyArray<string>;
  readonly rules?: RuleGroup | null;
}

export interface SegmentRegistry {
  create(input: CreateSegmentInput, now: string): Result<SegmentDefinition, SegmentConflictError>;
  get(id: SegmentId): Result<SegmentDefinition, SegmentNotFoundError>;
  update(id: SegmentId, input: UpdateSegmentInput, now: string): Result<SegmentDefinition, SegmentNotFoundError>;
  delete(id: SegmentId): Result<void, SegmentNotFoundError>;
  list(filter?: QueryFilter): ReadonlyArray<SegmentDefinition>;
  stats(id: SegmentId, memberCount: number, lastEvaluatedAt: string | null): Result<SegmentStats, SegmentNotFoundError>;
}

function makeSegmentId(): SegmentId {
  return SegmentIdSchema.parse(newId("seg"));
}

/** Create an in-memory segment registry. */
export function createSegmentRegistry(): SegmentRegistry {
  let store = new Map<string, SegmentDefinition>();

  function create(
    input: CreateSegmentInput,
    now: string
  ): Result<SegmentDefinition, SegmentConflictError> {
    for (const def of store.values()) {
      if (def.name === input.name) return err(new SegmentConflictError(input.name));
    }
    const def: SegmentDefinition = {
      id: makeSegmentId(),
      name: input.name,
      description: input.description ?? "",
      kind: input.kind,
      tags: Object.freeze([...(input.tags ?? [])]),
      rules: input.rules ?? null,
      createdAt: now,
      updatedAt: now,
    };
    store = new Map(store);
    store.set(def.id, def);
    return ok(def);
  }

  function get(id: SegmentId): Result<SegmentDefinition, SegmentNotFoundError> {
    const def = store.get(id);
    return def !== undefined ? ok(def) : err(new SegmentNotFoundError(id));
  }

  function update(
    id: SegmentId,
    input: UpdateSegmentInput,
    now: string
  ): Result<SegmentDefinition, SegmentNotFoundError> {
    const existing = store.get(id);
    if (existing === undefined) return err(new SegmentNotFoundError(id));
    const updated: SegmentDefinition = {
      ...existing,
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      tags: input.tags !== undefined ? Object.freeze([...input.tags]) : existing.tags,
      rules: input.rules !== undefined ? input.rules : existing.rules,
      updatedAt: now,
    };
    store = new Map(store);
    store.set(id, updated);
    return ok(updated);
  }

  function del(id: SegmentId): Result<void, SegmentNotFoundError> {
    if (!store.has(id)) return err(new SegmentNotFoundError(id));
    store = new Map(store);
    store.delete(id);
    return ok(undefined);
  }

  function list(filter?: QueryFilter): ReadonlyArray<SegmentDefinition> {
    const all = Array.from(store.values());
    if (filter === undefined) return all;
    return all.filter((def) => matchesFilter(def.kind, def.tags as string[], filter));
  }

  function stats(
    id: SegmentId,
    memberCount: number,
    lastEvaluatedAt: string | null
  ): Result<SegmentStats, SegmentNotFoundError> {
    if (!store.has(id)) return err(new SegmentNotFoundError(id));
    return ok({ segmentId: id, memberCount, lastEvaluatedAt });
  }

  return { create, get, update, delete: del, list, stats };
}
