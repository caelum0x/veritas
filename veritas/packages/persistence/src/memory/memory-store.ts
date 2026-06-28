// Generic in-memory keyed store with clone-on-write semantics for safe persistence.

/** A record that has at minimum a string id field. */
export interface HasId {
  readonly id: string;
}

/** Clones a value via JSON round-trip to ensure immutability. */
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * MemoryStore<T> holds entities keyed by their id.
 * All reads return clones; all writes store clones (clone-on-write).
 */
export class MemoryStore<T extends HasId> {
  private readonly data: Map<string, T> = new Map();

  /** Return a cloned entity by id, or undefined if not present. */
  get(id: string): T | undefined {
    const item = this.data.get(id);
    return item === undefined ? undefined : deepClone(item);
  }

  /** Return clones of all stored entities, optionally filtered. */
  all(): T[] {
    return Array.from(this.data.values()).map(deepClone);
  }

  /** Store a cloned copy of the entity, keyed by entity.id. */
  set(entity: T): T {
    const clone = deepClone(entity);
    this.data.set(entity.id, clone);
    return deepClone(clone);
  }

  /** Remove an entity by id. Returns true if it existed. */
  delete(id: string): boolean {
    return this.data.delete(id);
  }

  /** Return whether an entity with the given id exists. */
  has(id: string): boolean {
    return this.data.has(id);
  }

  /** Return the count of stored entities. */
  size(): number {
    return this.data.size;
  }

  /** Remove all stored entities. */
  clear(): void {
    this.data.clear();
  }
}
