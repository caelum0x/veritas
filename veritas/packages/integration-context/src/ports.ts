// Shared port registry — named interface slots wired at composition root.

/** Generic read port: fetches an entity by ID. */
export interface FindPort<T> {
  findById(id: string): Promise<T | null>;
}

/** Generic write port: persists an entity. */
export interface SavePort<T> {
  save(entity: T): Promise<T>;
}

/** Generic delete port: removes an entity by ID. */
export interface DeletePort {
  delete(id: string): Promise<void>;
}

/** Generic list port: returns a page of entities. */
export interface ListPort<T, Filter = Record<string, unknown>> {
  list(filter: Filter, limit: number, offset: number): Promise<readonly T[]>;
}

/** Combined CRUD port. */
export interface CrudPort<T, Filter = Record<string, unknown>>
  extends FindPort<T>,
    SavePort<T>,
    DeletePort,
    ListPort<T, Filter> {}

/** Port registry keyed by port name — resolved at composition root. */
export type PortRegistry = Readonly<Record<string, unknown>>;

/** Helper to assert a port is present in a registry. */
export function requirePort<K extends string, P>(
  registry: PortRegistry,
  key: K
): P {
  const port = registry[key];
  if (port === undefined || port === null) {
    throw new Error(`Required port "${key}" is not registered.`);
  }
  return port as P;
}
