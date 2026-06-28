// Registry mapping entity names to their repository instances.
import type { BaseRepository } from "./base-repository.js";

/** A known entity name key for type-safe lookup. */
export type EntityName = string;

/** Registry that holds repository instances keyed by entity name. */
export class RepositoryRegistry {
  private readonly repos = new Map<EntityName, BaseRepository<unknown>>();

  /** Register a repository for the given entity name. */
  register<T>(entity: EntityName, repo: BaseRepository<T>): void {
    if (this.repos.has(entity)) {
      throw new Error(`Repository for entity "${entity}" is already registered.`);
    }
    this.repos.set(entity, repo as BaseRepository<unknown>);
  }

  /** Retrieve a repository by entity name, throwing if not found. */
  get<T>(entity: EntityName): BaseRepository<T> {
    const repo = this.repos.get(entity);
    if (repo === undefined) {
      throw new Error(`No repository registered for entity "${entity}".`);
    }
    return repo as BaseRepository<T>;
  }

  /** Check whether a repository is registered for the given entity name. */
  has(entity: EntityName): boolean {
    return this.repos.has(entity);
  }

  /** Return all registered entity names. */
  keys(): ReadonlyArray<EntityName> {
    return Array.from(this.repos.keys());
  }

  /** Unregister a repository (useful for testing). */
  unregister(entity: EntityName): void {
    this.repos.delete(entity);
  }
}

/** Default singleton registry for the application. */
export const repositoryRegistry = new RepositoryRegistry();
