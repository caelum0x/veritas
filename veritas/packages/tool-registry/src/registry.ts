// Central in-memory tool registry: register, look up, and enumerate tools.

import { err, ok, type Result } from "@veritas/core";
import {
  type ToolDescriptor,
  type CreateToolDescriptor,
  makeToolDescriptor,
} from "./descriptor.js";
import {
  ToolNotFoundError,
  ToolAlreadyRegisteredError,
  ToolVersionConflictError,
} from "./errors.js";
import { searchTools, type SearchQuery, type SearchResult } from "./search.js";

type RegistryKey = `${string}@${string}`;

function toKey(id: string, version: string): RegistryKey {
  return `${id}@${version}` as RegistryKey;
}

export interface ToolRegistry {
  /** Register a new tool. Fails if (id, version) already exists. */
  register(
    input: CreateToolDescriptor,
  ): Result<ToolDescriptor, ToolAlreadyRegisteredError | ToolVersionConflictError>;

  /** Replace an existing tool descriptor (must share same id + version). */
  update(
    input: ToolDescriptor,
  ): Result<ToolDescriptor, ToolNotFoundError>;

  /** Remove a tool by id and version. */
  unregister(
    id: string,
    version: string,
  ): Result<ToolDescriptor, ToolNotFoundError>;

  /** Look up the latest active version of a tool by id. */
  getLatest(id: string): Result<ToolDescriptor, ToolNotFoundError>;

  /** Look up a specific (id, version) pair. */
  get(id: string, version: string): Result<ToolDescriptor, ToolNotFoundError>;

  /** Return all registered descriptors. */
  list(): readonly ToolDescriptor[];

  /** Paginated, filtered search. */
  search(query: SearchQuery): SearchResult;

  /** Number of entries in the registry. */
  readonly size: number;
}

/** Comparator: sort semver descriptors newest-first. */
function compareSemverDesc(a: ToolDescriptor, b: ToolDescriptor): number {
  const parse = (v: string) => v.split(".").map(Number) as [number, number, number];
  const [aMaj, aMin, aPatch] = parse(a.version);
  const [bMaj, bMin, bPatch] = parse(b.version);
  if (bMaj !== aMaj) return bMaj - aMaj;
  if (bMin !== aMin) return bMin - aMin;
  return bPatch - aPatch;
}

/** Create a new in-memory ToolRegistry instance. */
export function createToolRegistry(): ToolRegistry {
  // Keyed by `id@version`
  const store = new Map<RegistryKey, ToolDescriptor>();

  function allDescriptors(): ToolDescriptor[] {
    return Array.from(store.values());
  }

  return {
    register(input) {
      const key = toKey(input.id, input.version);
      if (store.has(key)) {
        return err(new ToolVersionConflictError(input.id, input.version));
      }
      const descriptor = makeToolDescriptor(input);
      store.set(key, descriptor);
      return ok(descriptor);
    },

    update(input) {
      const key = toKey(input.id, input.version);
      if (!store.has(key)) {
        return err(new ToolNotFoundError(`${input.id}@${input.version}`));
      }
      const updated: ToolDescriptor = { ...input, updatedAt: new Date().toISOString() };
      store.set(key, updated);
      return ok(updated);
    },

    unregister(id, version) {
      const key = toKey(id, version);
      const existing = store.get(key);
      if (!existing) {
        return err(new ToolNotFoundError(`${id}@${version}`));
      }
      store.delete(key);
      return ok(existing);
    },

    getLatest(id) {
      const versions = allDescriptors()
        .filter((d) => d.id === id)
        .sort(compareSemverDesc);
      if (versions.length === 0) {
        return err(new ToolNotFoundError(id));
      }
      return ok(versions[0]!);
    },

    get(id, version) {
      const key = toKey(id, version);
      const descriptor = store.get(key);
      if (!descriptor) {
        return err(new ToolNotFoundError(`${id}@${version}`));
      }
      return ok(descriptor);
    },

    list() {
      return allDescriptors();
    },

    search(query) {
      return searchTools(allDescriptors(), query);
    },

    get size() {
      return store.size;
    },
  };
}
